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
        data_csv = data_csv.replace(/\.metadata/g, '_object.metadata');
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
 * @param  {object} console - from tago
 */
function run_scheduler() {
    console.log("Running script");

    //const env_var = Utils.env_to_obj(console.environment);
    //if (!env_var.url) return console.log("Missing url environment variable");
    //if (!env_var.device_token) return console.log("Missing url environment variable");

    const mydevice = new Device('e0c16f6f-bfcd-449c-92f7-8463445edda7');

    co(function* () {
        const url = check_url('https://docs.google.com/spreadsheets/d/1fiaPSxwuK21uKsXF9fdq14fspid_ZrM9HFg1ivjeieY/edit#gid=0');
        const request = yield axios.get(url);
        if (!request.data && typeof request.data !== "string") return console.log("Can't access the URL");

        const data_list = yield convert_to_json(request.data);
        if (!data_list || !data_list[0]) return console.log("Tago can't get the excel archive by the URL. Something wrong happens");

        let stepnow = yield mydevice.find({ "variable": "stepnow", "query": "last_value" });
        stepnow = stepnow[0] ? stepnow[0].value : 0;

        const data     = data_list[stepnow] ? data_list[stepnow] : data_list[0];
        const serie    = data.serie || new Date().getTime();
        const location = yield transform_loc(data.location);
        const metadata = data.metadata;
        const unit     = data.unit;
        if (metadata) {
            Object.keys(metadata).forEach((n) => {
                metadata[n] = checkIsNumber(metadata[n]);
            });
        }

        const reset = data.reset_here;
        //default -  disable  | igual generate token
        function send_email() {
            console.log('Sending email...');
            const email_service = new Service(console.token).email;
            email_service.send(data.email, 'Tago Scheduler', data.email_msg);
        }

        if (data.email_msg && data.email_msg !== '' && data.email) send_email();
        ["time", "metadata", "email_msg", "email", "reset_here"].forEach(x => delete data[x]);
        let time;
        function format_var(variable, value) {
            value = checkIsNumber(value);
            let data_to_insert = {
                "variable": variable,
                "value": value,
                "serie": serie
            };
            if (time) data_to_insert.time = time;
            if (location) data_to_insert.location = location;
            if (metadata) data_to_insert.metadata = metadata;
            const unique_metadata = data[`${variable}_object`] ? data[`${variable}_object`].metadata : null;
            if (unique_metadata) {
                Object.keys(unique_metadata).forEach((n) => {
                    unique_metadata[n] = checkIsNumber(unique_metadata[n]);
                });
                data_to_insert.metadata = Object.assign({}, data_to_insert.metadata || {}, unique_metadata);
            }
            return data_to_insert;
        }
        let data_to_insert = [];
        Object.keys(data).forEach(key => {
            if (!key.includes('_object') && !key.includes('unit')) data_to_insert.push(format_var(key, data[key]));
        });

        data_to_insert.push({
            "variable": "stepnow",
            "value": data_list[stepnow + 1] ? stepnow + 1 : 0,
            serie
        });

        if (reset) {
            const remove_all = data_to_insert.map(x => mydevice.remove(x.variable, 'all'));
            const result = yield Promise.all(remove_all);
            console.log("Data Removed", result);
        }
        if (unit) {
            data_to_insert.map((element) => {
                Object.keys(unit).map((key) => {
                    if (element.variable === key) element.unit = unit[key];
                });
            });
        }
        yield mydevice.remove('product_1', 10).then(console.log);
        yield mydevice.remove('product_4', 10).then(console.log);
        const filtred_data = [];
        data_to_insert.forEach((x) => {
            if(x.value !== '###') filtred_data.push(x);
        });
        yield mydevice.insert(filtred_data);
        console.log("Succesfully Inserted schedule data");
    }).catch(console.log);
}
run_scheduler();
//setInterval(run_scheduler, 5000);
//module.exports = new Analysis(run_scheduler, '8b3922c0-c799-11e6-824d-3fae90187e42');
