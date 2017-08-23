## What this script does
Bring a live demo for your customers and team using Tago instead of showing a Powerpoint file! This application creates data in your Tago account to simulate a device using the content created in a Google Spreadsheet. Tago will transfer the data from each row of your spreadsheet one-by-one to help you to share how your connect product will look like even before you add real hardware (sensors) on it. The speed of the simulation will depend on the Time Interval that you define to run the script (with a minimum interval of 30 seconds). It is an automated way to simulate a real device.

## How to run the script
* Create a Google Spreadsheet by following this template: [Training Spreadsheet](https://docs.google.com/spreadsheets/d/1MF5xih03tlFQzZD7fBbFS8miLiOK-d-5o_8PqT3oEH8/edit?usp=sharing).<br>
* The variables to be inserted should be located in the first row of the spreadsheet. Values should be included in the cells below in the same column. The variable names should not contain **comma** or **spaces**; also the values should not contain **comma**;<br>
* Make sure that your spreadsheet is set for Public Visualization so that Tago is able to access it.
* Create a new Analysis in the admin website.<br>
* Upload the file `scheduler.js.tago.js` into the analysis that your just created.<br>
* Click on the tab **Environment Variables** and **New**. Type "*url*" on the variable key entry, and copy the URL from your Google Spreadsheet onto the "*value*' entry.<br>
* Create a new device, and get a token from the device that will receive the simulated data.<br>
* Click on **Environment Variables** and **New**. Input "*device_token*" on name entry, and the token on "*value*' entry.<br>
* Back to the **General Information** tab, select the **Time Interval to run this script** to define how often each row of your spreadsheet will be input to your device. Every row in the spreadsheet will be written in the device using that time interval. The system will start over to the first row when it get to the bottom of your spreadsheet that contains data<br>
* Click on **Save**.<br>

## Check if it is Running
* Go to the Analysis, in the admin, and select your analysis.<br>
* Click on the tab **Console**.<br>
* Click on **Run Script**.<br>
* Check the Console to see if there is any error or if it is running successful.<br>

## Google Spreadsheet and private properties
You can input some reserved variables in your spreadsheet, that will not be write into your bucket. These variables can trigger special conditions when the script get's to that line, such as to send email or add color propertie to the variables written at that moment.
The reserved variables are:
* **color**: Will become a propertie of all variables generated by the spreadsheet. You can visualize colors in some widgets like maps or tables;
* **time**: Will become a propertie of all variables generated by the spreadsheet. It defines a time for the variable to be added; the time can be in the future or in the past. Make sure to use the format *"MM/DD/YYYY HH:mm"*;
* **email**: Send an e-mail to the address. Use with email_msg to personalize the message.
* **email_msg**: Body of the message to be sent. Use it with email.
