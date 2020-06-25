const nodeMailer = require('nodemailer');
const pug = require('pug')
const htmlToText = require('html-to-text')
const path = require('path')

module.exports = class Email{
    constructor(user, url){
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = `James Ashwin <${process.env.EMAIL_FROM}>`;
    }

    newTransport(){
        if(process.env.NODE_ENV === 'production'){
            return nodeMailer.createTransport({ //Creating a transporter service for emails to reach client
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                auth: {
                    user: process.env.EMAIL_USERNAME,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }

        return nodeMailer.createTransport({ //Creating a transporter service for emails to reach client
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async send(template, subject) {
        const emailPath = path.join(__dirname, `../views/emails/${template}.pug`)
        const html = pug.renderFile(emailPath, {
            firstName: this.firstName,
            url: this.url,
            subject
        });
        
        const emailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.fromString(html)
        };

        await this.newTransport().sendMail(emailOptions);
    };

    async sendWelcome(){
        await this.send('welcome', 'Welcome to the Natours Family!')
    }

    async sendPasswordReset(){
        await this.send('passwordReset', 'Your password reset token (valid for only 10 minutes)')
    }
}

