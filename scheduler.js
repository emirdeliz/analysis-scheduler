'use strict';

const Analysis = require('tago/analysis');
const Utils = require('tago/utils');
const Service = require('tago/services');
const Device = require('tago/device');
const converter = require('json-2-csv');
const axios = require('axios');
const co = require('co');
const url_node = require('url');

function check_url(url) {
    if (url.indexOf('docs.google.com') === -1 && url.indexOf('spreadsheets') === -1) return url;
    const parse_url = url_node.parse(url);
    let pathname = parse_url.pathname.split("/");
    pathname = pathname.find(x => x.length >= 25); //need to improve this logic?

    url = `https://spreadsheets.google.com/feeds/download/spreadsheets/Export?key=${pathname}&exportFormat=csv`;
    return url;
}

function convert_to_json(data_csv) {
    return new Promise((resolve, reject) => {
        const options = {
            "delimiter": {
                "eol": "\r"
            }
        };

        converter.csv2json(data_csv, options, (err, result) => {
            if (err) return reject("Can't convert csv to json. Something ins't right");
            resolve(result);
        });
    });
}

function transform_loc(location) {
    return new Promise((resolve, reject) => {
        if (!location || location === '') return resolve(null);

        location = location.split(";");
        if (location.length < 2) return reject("Invalid Location");
        try {
            location = { "lat": Number(location[1]), "lng": Number(location[0]) };
        } catch (error) {
            return reject(error);
        }
        resolve(location);
    });
}
function checkIsNumber(value) {
    let number = Number(value);
    if (Number.isNaN(number)) return value;
    else return value = number;
}
/**
 * Create a scheduler based in a URL from GoogleDrive or another source.
 * Reserverd variables: email, email_msg, color, location, reset_here and time.
 * @param  {object} context - from tago
 */
function run_scheduler(context) {
    context.log("Running script");

    const env_var = Utils.env_to_obj(context.environment);
    if (!env_var.url) return context.log("Missing url environment variable");
    if (!env_var.device_token) return context.log("Missing url environment variable");

    const mydevice = new Device(env_var.device_token);

    co(function* () {
        const url = check_url(env_var.url);
        const request = yield axios.get(url);
        if (!request.data && typeof request.data !== "string") return context.log("Can't access the URL");

        const data_list = yield convert_to_json(request.data);
        if (!data_list || !data_list[0]) return context.log("Tago can't get the excel archive by the URL. Something wrong happens");

        let stepnow = yield mydevice.find({ "variable": "stepnow", "query": "last_value" });
        stepnow = stepnow[0] ? stepnow[0].value : 0;

        const data = data_list[stepnow] ? data_list[stepnow] : data_list[0];
        const serie = new Date().getTime();
        const location = yield transform_loc(data.location);
        const color = data.color;
        const reset = data.reset_here;
        let time;

        function send_email() {
            context.log('Sending email...');
            const email_service = new Service(context.token).email;
            email_service.send(data.email, 'Tago Scheduler', data.email_msg);
        }

        if (data.email_msg && data.email_msg !== '' && data.email) send_email();
        ["time", "color", "email_msg", "email", "reset_here"].forEach(x => delete data[x]);

        function format_var(variable, value) {
            value = checkIsNumber(value);
            let data_to_insert = {
                "variable": variable,
                "value": value,
                "serie": serie
            };

            if (time) data_to_insert.time = time;
            if (location) data_to_insert.location = location;
            if (color) data_to_insert.metadata = { color };

            return data_to_insert;
        }

        const data_to_insert = [];
        Object.keys(data).forEach(key => {
            data_to_insert.push(format_var(key, data[key]));
        });

        data_to_insert.push({
            "variable": "stepnow",
            "value": data_list[stepnow + 1] ? stepnow + 1 : 0,
            serie
        });

        if (reset) {
            const remove_all = data_to_insert.map(x => mydevice.remove(x.variable, 'all'));
            const result = yield Promise.all(remove_all);
            context.log("Data Removed", result);
        }

        yield mydevice.insert(data_to_insert);
        context.log("Succesfully Inserted schedule data");
    }).catch(context.log);
}

module.exports = new Analysis(run_scheduler, '933386e0-6660-11e6-b31b-3b9e8e051cf6');