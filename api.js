const { check, validationResult } = require("express-validator");
const appModel = require("../models/dbconnection");
const CryptoJS = require("crypto-js");
const { async } = require("q");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const nodemailer = require("nodemailer");
let postmark = require("postmark");

const accountSid = "AC70f1ae198b1e2672c0e6f3e546f0c588"; //process.env.TWILIO_ACCOUNT_SID;
const authToken = "3a37cf94ee4c4b3440527e35921b1172"; //process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
//client.logLevel = 'debug';



async function sendSMSToLead(to_numer, message_text, conId) {

    if (to_numer && to_numer !== '' && message_text && message_text !== '') {
        let leadPhone = "+" + to_numer.replace(/[+.]/g, '');

        console.log(leadPhone, message_text, conId)
        let callbackUrl = global.SITE_URL + "api/sms_webhook_call/" + conId;
        //let JSONBody = ;
        client.messages
            .create({ "body": message_text, "from": "+19498280454", "to": leadPhone })
            .then(message => {
                console.log(message.sid);
                let sqlQuery = "UPDATE conversations SET message_sid=? WHERE id=?";
                appModel.query(sqlQuery, [message.sid, conId], function (err, rows) {
                    return true;
                });
            });
        return true;
    }
    else {
        console.log("empty", to_numer, message_text)
        return false;
    }
}


async function sendEmailToLead(first_name, to_email, message_text, conId) {
    if (to_email && to_email !== '' && message_text && message_text !== '') {

        return new Promise(async (resolve, reject) =>  {
            // Require:
            let message =`Hi ${first_name},<br /><br />${message_text}<br /><br />Thanks,<br />Draper and Kramer`
            // Send an email:
            let client = new postmark.ServerClient("ffb7d6c0-e26b-4dc2-987c-478518116010");
            let response = await client.sendEmail({
                    "From": "notifications@dkmctexttool.com",
                    "To": to_email,
                    "ReplyTo": "notifications@inbound.dkmctexttool.com",
                    "Subject": 'New Message from Draper and Kramer',
                    "HtmlBody": "<html><body>"+message+"</body></html>",
                    "TextBody": "",
                    "MessageStream": "outbound"
                });
            console.log("Email response", response);
            let query = "UPDATE conversations SET email_message_id=? WHERE id=?";
            appModel.query(query, [response.MessageID,conId],async (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });         
        })
    }
    else {
        console.log("empty", to_email, message_text)
        return false;
    }
    /*if (to_email && to_email !== '' && message_text && message_text !== '') {
        let transporter = nodemailer.createTransport({
            host: "smtp-mail.outlook.com",
            port: 587,
            
            ignoreTLS: false,
            auth: {
              user: "notifications@dkmctexttool.com", // generated ethereal user
              pass: "QazWsxEdc2599", // generated ethereal password
            }
          });

          let message =`Hi ${first_name},<br /><br />${message_text}<br /><br />Thanks,<br />Draper and Kramer`

          // send mail with defined transport object
          let info = await transporter.sendMail({
            from: '"dkmctexttool" <notifications@dkmctexttool.com>', // sender address
            to: to_email, // list of receivers
            subject: 'New Message from Draper and Kramer', // Subject line
            //text: 'New Message from Draper and Kramer', // plain text body
            html: message, // html body
          });

          console.log("Message sent: %s", info.messageId);
        return true;
    }
    else {
        console.log("empty", to_email, message_text)
        return false;
    }*/
}

module.exports = {

    agent_login: async function (req, res, next) {

        let post = req.body;
        if (typeof (post) !== 'undefined' && typeof (post.email) !== 'undefined' && post.email !== '' && typeof (post.password) !== 'undefined' && post.password !== '') {
            let email = post.email;
            let password = post.password;
            let searchSql = "SELECT * FROM users WHERE `email` = ? AND status IN(1,3)";
            appModel.query(searchSql, [email], async function (err, rows) {
                if (err) {
                    res.send({ "status": "error", "message": err });
                } else {
                    if (rows && rows.length == 0) {
                        res.send({ "status": "error", "message": "Email and password is not correct" });
                    } else {
                        password = CryptoJS.HmacMD5(password, "ilovescotchscotchyscotchscotch").toString();
                        if (password !== rows[0].password) {
                            res.send({ "status": "error", "message": "Password is not correct" });
                        } else {
                            if (rows[0]['status'] == 3) {
                                res.send({ "status": "error", "message": "Account awaiting approval from admin" });
                            }
                            else if (rows[0]['status'] == 4) {
                                res.send({ "status": "error", "message": "Account request is declined" });
                            }
                            else {
                                res.send({ "status": "ok", "message": "Success", data: rows[0] });
                            }

                        }
                    }

                }
            });
        } else {
            res.send({ "status": "error", "message": "Please enter valid information" });
        }

    },

    User_verification: function (req, res, next) {
        console.log("id =", req.params.id);
        var id = req.params.id;

        if (typeof (id) !== 'undefined') {
            let sqlQuery = "SELECT * FROM users Where id = ? AND status = ?";
            appModel.query(sqlQuery, [id, 0], function (err, result) {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown user" });
                    } else {

                        // let enc = encrypt(id.toString());                      
                        let url = "http://3.220.88.200:8009/api/agentId/" + id;
                        res.status(200).json({ 'status': 'success', 'url': url });
                    }
                }
            })
        } else {
            res.json({ "status": "error", "message": "Invalid" });
        }
    },

    getAgent_by_id: async (req, res, next) => {
        console.log('encrypt_id =', req.params.getAgent_id);
        var encrypt_id = req.params.getAgent_id;

        if (typeof (encrypt_id) !== "undefined") {

            let sqlQuery = 'SELECT id,first_name,last_name,email,phone_number,state, licence_no, licence_expire,licence_photo,status,photo, DATE_FORMAT(createdAt,"%W, %M %d %Y") as createdAt,updatedAt FROM users Where id = ? and status = ?';

            appModel.query(sqlQuery, [encrypt_id, 0], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown user" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        } else {
            res.json({ "status": "error", "message": "Invalid" });
        }
    },

    updateAgentPassword: async (req, res, next) => {
        var getAgent_id = req.params.getAgent_id;
        if (typeof (getAgent_id) !== "undefined") {

            if (typeof (req.body.password) !== "undefined" && typeof (req.body.confirm_password) !== "undefined" && req.body.password !== "" && req.body.confirm_password !== "") {
                if (req.body.password == req.body.confirm_password) {
                    let pwd = req.body.password;
                    let id = getAgent_id;

                    let password = CryptoJS.HmacMD5(pwd, "ilovescotchscotchyscotchscotch").toString();
                    let sqlQuery = "UPDATE users SET password = ? WHERE id = ?";

                    appModel.query(sqlQuery, [password, id], (err, result) => {
                        if (err) {
                            res.json({ 'status': 'error', 'message': err });
                        } else {
                            if (result && result.length == 0) {
                                res.json({ 'status': 'error', 'message': 'Unknown user' });
                            } else {

                                let sqlQuery_2 = "SELECT id,first_name,last_name,email,phone_number,state,licence_expire,licence_photo,status,photo,createdAt,updatedAt from users where id ='" + id + "'";
                                appModel.query(sqlQuery_2, (err1, data) => {
                                    if (err1) {
                                        res.json({ 'status': 'error', 'message': err1 });
                                    } else {
                                        res.status(200).json({ 'status': 'success', 'message': 'Password Updated Successfully', 'data': data });
                                    }
                                })

                            }
                        }
                    });
                } else {
                    res.json({ "status": "error", "message": "Password and Confirm password not Matched" });
                }
            } else {
                res.json({ "status": "error", "message": "Please fill password and confirm password" });
            }
        } else {
            res.json({ "status": "error", "message": "Invalid" });
        }
    },

    changePasswordAgent: async (req, res, next) => {
        var getAgent_id = req.params.getAgent_id;
        if (typeof (getAgent_id) !== "undefined") {
            if (typeof (req.body.old_password) === "undefined" && req.body.old_password === "") {
                res.json({ 'status': 'error', 'message': err });
            }

            let old_password = CryptoJS.HmacMD5(req.body.old_password, "ilovescotchscotchyscotchscotch").toString();
            let checkSql = "SELECT * from users where id= ?";
            appModel.query(checkSql, [getAgent_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    if (old_password === result[0].password) {
                        if (typeof (req.body.password) !== "undefined" && typeof (req.body.confirm_password) !== "undefined" && req.body.password !== "" && req.body.confirm_password !== "") {
                            if (req.body.password == req.body.confirm_password) {
                                let pwd = req.body.password;
                                let id = getAgent_id;

                                let password = CryptoJS.HmacMD5(pwd, "ilovescotchscotchyscotchscotch").toString();
                                let sqlQuery = "UPDATE users SET password = ? WHERE id = ?";

                                appModel.query(sqlQuery, [password, id], (err, result) => {
                                    if (err) {
                                        res.json({ 'status': 'error', 'message': err });
                                    } else {
                                        if (result && result.length == 0) {
                                            res.json({ 'status': 'error', 'message': 'Unknown user' });
                                        } else {

                                            let sqlQuery_2 = "SELECT id,first_name,last_name,email,phone_number,state,licence_expire,licence_photo,status,photo,createdAt,updatedAt from users where id ='" + id + "'";
                                            appModel.query(sqlQuery_2, (err1, data) => {
                                                if (err1) {
                                                    res.json({ 'status': 'error', 'message': err1 });
                                                } else {
                                                    res.status(200).json({ 'status': 'success', 'message': 'Password Updated Successfully', 'data': data });
                                                }
                                            })

                                        }
                                    }
                                });
                            } else {
                                res.json({ "status": "error", "message": "Password and Confirm password not Matched" });
                            }
                        } else {
                            res.json({ "status": "error", "message": "Please fill password and confirm password" });
                        }
                    } else {
                        res.json({ "status": "error", "message": "notMacthed" });
                    };
                }
            })
        } else {
            res.json({ "status": "error", "message": "Invalid" });
        }
    },

    edit_profile: async (req, res, next) => {
        console.log('encrypt_id =', req.params.id);
        var id = req.params.id;

        if (typeof (id) !== "undefined") {

            let sqlQuery = "SELECT id,first_name,last_name,email,phone_number,state,licence_no, licence_expire,licence_photo,status,photo,createdAt,updatedAt FROM users Where id = ?";

            appModel.query(sqlQuery, [id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown user" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result[0] });
                    }
                }
            });
        } else {
            res.json({ "status": "error", "message": "Invalid" });
        }
    },

    get_states: async (req, res, next) => {
        let sqlQuery = "SELECT abbrev, name from states WHERE status=1";
        appModel.query(sqlQuery, (err, result) => {
            if (err) {
                res.json({ 'status': 'error', 'message': err });
            } else {
                if (result && result.length == 0) {
                    res.json({ 'status': 'error', 'message': "Unknown user" });
                } else {
                    res.status(200).json({ 'status': 'success', 'data': result });
                }
            }
        });
    },

    getConversations: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agentId) !== 'undefined' && data.agentId !== '') {
            let sqlQuery = "SELECT u.first_name, u.last_name, u.email, u.phone_number, u.state, u.address, u.tags, u.contact_type, con.contact_id, con.conversation_type, con.conversation_text, con.posted_by, CONCAT(a.first_name,' ',a.last_name) as by_agent_name, DATE_FORMAT(con.createdAt, '%d/%b %l:%i %p') as createdAt, con.id, con.read_status from conversations as con INNER JOIN contacts as u on con.contact_id=u.id INNER JOIN users as a on con.agent_id=a.id WHERE u.contact_type IN (1,3) AND con.agent_id=?  AND con.id in (select max(id) from conversations WHERE agent_id=? group by contact_id) ORDER BY con.id DESC";
            appModel.query(sqlQuery, [data.agentId, data.agentId], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown user" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }

    },

    getConversation_for_one_contact: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '') {
            let sqlQuery = "SELECT u.first_name, u.last_name, u.email, u.phone_number, u.state, u.address,  con.conversation_type, con.conversation_text, con.posted_by, CONCAT(a.first_name,' ',a.last_name) as by_agent_name, DATE_FORMAT(con.createdAt, '%d/%b %l:%i %p') as createdAt from conversations as con INNER JOIN contacts as u on con.contact_id=u.id INNER JOIN users as a on con.agent_id=a.id WHERE con.agent_id=? AND con.contact_id=? ORDER BY con.id ASC";
            appModel.query(sqlQuery, [data.agent_id, data.contact_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown user" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    send_message: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.conversation_text) !== 'undefined' && data.conversation_text !== '' && typeof (data.conversation_type) !== 'undefined' && data.conversation_type !== '') {

            let insertSql = "INSERT INTO conversations SET agent_id=?, contact_id=?, conversation_type=?, conversation_text=?, posted_by=?, createdAt=now()";

            appModel.query(insertSql, [data.agent_id, data.contact_id, data.conversation_type, data.conversation_text, data.posted_by], (err, rows) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {

                    let sqlQuery = "SELECT con.id, u.first_name, u.last_name, u.email, u.phone_number, u.state, u.tags, u.contact_type, u.address,  con.conversation_type, con.conversation_text, con.posted_by, CONCAT(a.first_name,' ',a.last_name) as by_agent_name, DATE_FORMAT(con.createdAt, '%d/%b %l:%i %p') as createdAt from conversations as con LEFT JOIN contacts as u on con.contact_id=u.id INNER JOIN users as a on con.agent_id=a.id WHERE con.id=?";
                    appModel.query(sqlQuery, [rows.insertId], (err, result) => {
                        if (err) {
                            res.json({ 'status': 'error', 'message': err });
                        }
                        else {
                            if (result && result.length == 0) {
                                res.json({ 'status': 'error', 'message': "Unknown user" });
                            } else {
                                //SEND SMS
                                if (result[0]['conversation_type'] == 'Sms') {
                                    sendSMSToLead(result[0]['phone_number'], result[0]['conversation_text'], result[0]['id']);
                                }
                                else {
                                    sendEmailToLead(result[0]['first_name'], result[0]['email'], result[0]['conversation_text'], result[0]['id'])
                                }
                                res.status(200).json({ 'status': 'success', 'data': result[0] });
                            }
                        }
                    });
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    update_profile: async (req, res, next) => {
        console.log(req.files);
        console.log(req.body)
        // var body = req.body;
        // return false;
        var photo, licence_photo;
        var imgName = req.files
        if (req.files.length > 0) {
            imgName.forEach(e => {
                if (e.fieldname == 'photo') {
                    photo = e.filename;
                }
                if (e.fieldname == 'licence_photo') {
                    licence_photo = e.filename;
                }
            });
        }

        // console.log('photo =',photo);
        // console.log('licence_photo =',licence_photo);
        // return false;
        var getid = req.params.id

        if (typeof (getid) !== "undefined") {
            await check("first_name").isLength({ min: 2 }).withMessage("First name is required and must be at least 2 chars long.").run(req);
            await check("phone").isLength({ min: 8, max: 15 }).withMessage("phone_number is required.").run(req);
            let errors = validationResult(req);
            // console.log(123); return false;
            if (errors.isEmpty()) {
                var states;
                let q = "SELECT * FROM states";
                appModel.query(q, function (err, row) {
                    if (err) {
                        res.json({ 'status': 'error', 'message': err });
                    } else {
                        states = row;
                        var qd = "SELECT id FROM users WHERE id ='" + req.params.id + "'";
                        appModel.query(qd, function (err, rows) {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            } else {
                                if (rows.length > 0) {
                                    let photo1 = (typeof (photo) !== 'undefined') ? photo : '';
                                    let licence_photo1 = (typeof (licence_photo) !== 'undefined') ? licence_photo : '';
                                    let qd2 = "UPDATE users SET first_name = ?,last_name = ?,phone_number = ?,state = ?,licence_no = ?,licence_expire = ?,licence_photo=?,photo=?, updatedAt=now() WHERE id = ?";
                                    let body = req.body;
                                    let array_data = [body.first_name, body.last_name, body.phone, body.state, body.licence_no, body.licence_expire, licence_photo1, photo1, getid];

                                    appModel.query(qd2, array_data, function (err, rows) {
                                        if (err) {
                                            res.json({ 'status': 'error', 'message': err });
                                        } else {


                                            let sqlQuery = "SELECT id,first_name,last_name,email,phone_number,state,licence_expire,licence_photo,status,photo,createdAt,updatedAt FROM users Where id = ? and status = ?";

                                            appModel.query(sqlQuery, [getid, 1], (err, result) => {
                                                if (err) {
                                                    res.json({ 'status': 'error', 'message': err });
                                                } else {
                                                    if (result && result.length == 0) {
                                                        res.json({ 'status': 'error', 'message': "Unknown user" });
                                                    } else {
                                                        res.status(200).json({
                                                            'status': 'success',
                                                            'message': 'Profile Updated Successfully',
                                                            'data': result,
                                                            'states': states
                                                        });
                                                    }
                                                }
                                            });

                                        }
                                    });

                                } else {
                                    res.status(200).json({ 'status': 'success', 'message': 'No Record Found', 'states': states });
                                }
                            }
                        });
                    }
                });
            } else {
                res.json({ "status": "error", "message": errors });
            }
        } else {
            res.json({ "status": "error", "message": "User Undefined" });
        }
    },

    // update_user_profile update Without Upload Image
    update_user_profile: async (req, res, next) => {
        var getid = req.params.id;
        var file = req.files;
        var post = req.body;

        if (typeof (getid) !== "undefined") {
            await check("first_name").isLength({ min: 2 }).withMessage("First name is required and must be at least 2 chars long.").run(req);
            await check("last_name").isLength({ min: 2 }).withMessage("Last name is required and must be at least 2 chars long.").run(req);
            await check("phone").isLength({ min: 8, max: 15 }).withMessage("phone_number is required.").run(req);
            let errors = validationResult(req);

            if (errors.isEmpty()) {
                var states;
                let q = "SELECT * FROM states";
                appModel.query(q, function (err, row) {
                    if (err) {
                        res.json({ 'status': 'error', 'message': err });
                    } else {
                        states = row;
                        var qd = "SELECT id FROM users WHERE id ='" + req.params.id + "'";
                        appModel.query(qd, function (err, rows) {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            } else {
                                var updatephoto = '';
                                var update_p_photo = '';

                                if (rows.length > 0) {
                                    if (post.licence_photo === 'null') {
                                        post.licence_photo = null;
                                    }

                                    if (post.photo === 'null') {
                                        post.photo = null;
                                    }

                                    if (file.licence_photo) {
                                        updatephoto = file.licence_photo[0].filename;
                                    } else {
                                        updatephoto = post.licence_photo;
                                    }

                                    if (file.photo) {
                                        update_p_photo = file.photo[0].filename;
                                    } else {
                                        update_p_photo = post.photo;
                                    }

                                    var qd2 = "UPDATE users SET status=3, first_name = ?,last_name = ?,phone_number = ?,state = ?,licence_no = ?,licence_expire = ?,licence_photo = ?,photo = ? WHERE id = ?";
                                    var array_data = [post.first_name, post.last_name, post.phone, post.state, post.licence_no, post.licence_expire, updatephoto, update_p_photo, getid];
                                    appModel.query(qd2, array_data, function (err, rows) {
                                        if (err) {
                                            res.json({ 'status': 'error', 'message': err });
                                        } else {

                                            let sqlQuery = "SELECT id,first_name,last_name,email,phone_number,state,licence_expire,licence_photo,status,photo,createdAt,updatedAt FROM users WHERE id = ?";

                                            appModel.query(sqlQuery, [getid], (err, result) => {
                                                if (err) {

                                                    res.json({ 'status': 'error', 'message': err });
                                                } else {
                                                    if (result && result.length == 0) {
                                                        res.json({ 'status': 'error', 'message': "Unknown user" });
                                                    } else {
                                                        res.status(200).json({
                                                            'status': 'success',
                                                            'message': 'Profile Updated Successfully',
                                                            'data': result,
                                                            'states': states
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    });

                                } else {
                                    res.status(200).json({ 'status': 'success', 'message': 'No Record Found', 'states': states });
                                }
                            }
                        });
                    }
                });
            } else {
                res.json({ "status": "error", "message": errors });
            }
        } else {
            res.json({ "status": "error", "message": "User Undefined" });
        }
    },

    // update_user_profile update Without Upload Image
    profile_update_request: async (req, res, next) => {
        var getid = req.params.id;
        var file = req?.files;
        var post = req?.body;

        if (typeof getid !== "undefined") {
            await check("first_name")
                .isLength({ min: 2 })
                .withMessage("First name is required and must be at least 2 chars long.")
                .run(req);
            await check("last_name")
                .isLength({ min: 2 })
                .withMessage("Last name is required and must be at least 2 chars long.")
                .run(req);
            await check("phone")
                .isLength({ min: 8, max: 15 })
                .withMessage("phone_number is required.")
                .run(req);

            let errors = validationResult(req);
            if (errors.isEmpty()) {
                var states;
                let q = "SELECT * FROM states";
                appModel.query(q, function (err, row) {
                    if (err) {
                        res.json({ status: "error", message: err });
                    } else {
                        states = row;
                        var qd = "SELECT id FROM users WHERE id ='" + req.params.id + "'";
                        appModel.query(qd, function (err, rows) {
                            if (err) {
                                res.json({ status: "error", message: err });
                            } else {
                                var updatephoto = '';
                                var update_p_photo = '';

                                if (rows.length > 0) {
                                    if (post.licence_photo === 'null') {
                                        post.licence_photo = null;
                                    }

                                    if (post.photo === 'null') {
                                        post.photo = null;
                                    }

                                    if (file.licence_photo) {
                                        updatephoto = file.licence_photo[0].filename;
                                    } else {
                                        updatephoto = post.licence_photo;
                                    }

                                    if (file.photo) {
                                        update_p_photo = file.photo[0].filename;
                                    } else {
                                        update_p_photo = post.photo;
                                    }

                                    var qd2 = `INSERT INTO users_new_profile SET status=1, first_name ='${req.body.first_name}' ,last_name ='${req.body.last_name}',phone_number='${req.body.phone}',state ='${req.body.state.toString().replace(/\s*,\s*/g, ",")}',licence_no='${req.body.licence_no}',licence_expire ='${req.body.licence_expire}', licence_photo='${updatephoto}',parent_user_id='${req.params.id}', photo='${update_p_photo}', createdAt=now()`;
                                    appModel.query(qd2, function (err, rows) {
                                        if (err) {
                                            console.log(err, 'err')
                                            res.json({ status: "error", message: err });
                                        } else {
                                            let sqlQuery = "SELECT * FROM users WHERE id = ?";

                                            appModel.query(sqlQuery, [getid], (err, result) => {
                                                if (err) {
                                                    res.json({ status: "error", message: err });
                                                } else {
                                                    if (result && result.length == 0) {
                                                        res.json({
                                                            status: "error",
                                                            message: "Unknown user",
                                                        });
                                                    } else {
                                                        res.status(200).json({
                                                            status: "success",
                                                            message:
                                                                "Your profile has been successfully submitted for approval. When it is approved, you will be notified by email.",
                                                            data: result,
                                                            states: states,
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    res.status(200).json({
                                        status: "success",
                                        message: "No Record Found",
                                        states: states,
                                    });
                                }
                            }
                        });
                    }
                });
            } else {
                res.json({ status: "error", message: errors });
            }
        } else {
            res.json({ status: "error", message: "User Undefined" });
        }
    },

    getContactByUserId: async (req, res, next) => {

        if (typeof (req.params.userId) !== 'undefined') {
            let sqlQuery = "SELECT id,first_name,last_name,email,licence_expire,phone_number,state,licence_expire FROM users Where id = '" + req.params.userId + "' AND status = 1";
            appModel.query(sqlQuery, (err, row) => {
                if (err) {
                    res.send({ 'status': 'error', 'message': err });
                } else {
                    if (row && row.length == 1) {
                        let pagination = "";
                        let sqlQuery2 = "SELECT * from contacts where user_fid = '" + req.params.userId + "' AND contact_type=1";
                        appModel.query(sqlQuery2, (err2, rows) => {
                            if (err2) {
                                res.send({ 'status': 'error', 'message': err2 });
                            } else {
                                if (rows && rows.length > 0) {
                                    // res.send({ "status": "ok", "message": "Success", 'user':row });
                                    res.send({ "status": "ok", "message": "Success", 'user': row, 'contact': rows });
                                } else {
                                    res.send({ 'status': 'error', 'message': "No contact", 'user': row });
                                }
                            }
                        })
                    } else {
                        res.send({ "status": "error", "message": "No User Records" });
                    }
                }
            })
        } else {
            res.send({ "status": "error", "message": "User undefined." });
        }

    },


    list_my_leads: async (req, res, next) => {
        let data = req.body;
        console.log(req.params);
        if (typeof (req.params.userId) !== 'undefined') {
            let sqlQuery = "SELECT id,first_name,last_name,email,licence_expire,phone_number,state,licence_expire FROM users Where id = '" + req.params.userId + "' AND status = 1";
            appModel.query(sqlQuery, (err, row) => {
                if (err) {
                    res.send({ 'status': 'error', 'message': err });
                } else {
                    console.log("row", row);
                    if (row && row.length == 1) {
                        let pagination = "";
                        if (typeof (data.page_start_from) !== 'undefined' && data.page_start_from !== '' && typeof (data.page_limit) !== 'undefined' && data.page_limit !== '') {
                            pagination = `LIMIT ${data.page_start_from}, ${data.page_limit}`;
                        }
                        let sqlQuery2 = "SELECT * from contacts where user_fid = '" + req.params.userId + "' AND contact_type=1 ORDER BY id DESC " + pagination;
                        console.log("sqlQuery2", sqlQuery2)
                        appModel.query(sqlQuery2, (err2, rows) => {
                            if (err2) {
                                res.send({ 'status': 'error', 'message': err2 });
                            } else {
                                if (rows && rows.length > 0) {
                                    // res.send({ "status": "ok", "message": "Success", 'user':row });
                                    res.send({ "status": "ok", "message": "Success", 'user': row, 'contact': rows });
                                } else {
                                    res.send({ 'status': 'error', 'message': "No contact", 'user': row });
                                }
                            }
                        })
                    } else {
                        res.send({ "status": "error", "message": "No User Records" });
                    }
                }
            })
        } else {
            res.send({ "status": "error", "message": "User undefined." });
        }

    },

    create_opportunity: async (req, res, next) => {
        let agentId = req.params.agentId
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.email) !== 'undefined' && data.email !== '' && typeof (data.first_name) !== 'undefined' && data.first_name !== '' && typeof (data.last_name) !== 'undefined' && data.last_name !== '' && typeof (data.address) !== 'undefined' && data.address !== '' && typeof (data.city) !== 'undefined' && data.city !== '' && typeof (data.opportunity_name) !== 'undefined' && data.opportunity_name !== '' && typeof (data.phone) !== 'undefined' && data.phone !== '' && typeof (data.stage) !== 'undefined' && data.stage !== '' && typeof (data.state) !== 'undefined' && data.state !== '' && typeof (data.zip_code) !== 'undefined' && data.zip_code !== '' && typeof (data.status) !== 'undefined' && data.status !== '') {

            //CHECK EXISTING CONTACTS
            let sqlQuery = "SELECT id FROM contacts WHERE email=?";
            appModel.query(sqlQuery, [data.email], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length > 0) {
                        res.json({ 'status': 'error', 'message': "Contact already exists with this email address" });
                    }
                    else {
                        let insertSql = "INSERT INTO contacts SET email=?, first_name=?, last_name=?, phone_number=?, state=?, address=?, stage=?, city=?, post_code=?, user_fid=?, status=?, contact_type=?, created=now()";

                        appModel.query(insertSql, [data.email, data.first_name, data.last_name, data.phone, data.state, data.address, 'opportunity', data.city, data.zip_code, agentId, 1, 3], (err, rows) => {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            }
                            else {
                                let insertSql = "INSERT INTO opportunities SET agent_id=?, name=?, pipeline=?, opp_stage=?, lead_value=?, contact_id=?,  status=?, createdAt=now(), updatedAt=now()";
                                let placeholder = [agentId, data.opportunity_name, data.pipeline, data.stage, data.lead_value, rows.insertId, data.status]
                                appModel.query(insertSql, placeholder, (err1, rows1) => {
                                    if (err1) {
                                        res.json({ 'status': 'error', 'message': err1 });
                                    }
                                    else {
                                        res.status(200).json({ 'status': 'success' });
                                    }
                                });
                            }
                        });
                    }
                }
            })



        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    create_opportunity_from_task: async (req, res, next) => {
        let agentId = req.params.agentId
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.opportunity_name) !== 'undefined' && data.opportunity_name !== '' && typeof (data.stage) !== 'undefined' && data.stage !== '' && typeof (data.status) !== 'undefined' && data.status !== '') {

            //CHECK EXISTING CONTACTS
            let sqlQuery = "SELECT id FROM contacts WHERE email=?";
            appModel.query(sqlQuery, [data.email], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length > 0) {
                        res.json({ 'status': 'error', 'message': "Contact already exists with this email address" });
                    }
                    else {
                        let insertSql = "SELECT id FROM opportunities WHERE contact_id=?";

                        appModel.query(insertSql, [data.contact_id], (err, rows) => {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            }
                            else {
                                if (rows && rows.length > 0) {
                                    res.json({ 'status': 'error', 'message': "This user is already added in opportunity" });
                                }
                                else {
                                    let insertSql = "INSERT INTO opportunities SET agent_id=?, name=?, pipeline=?, opp_stage=?, lead_value=?, contact_id=?,  status=?, createdAt=now(), updatedAt=now()";
                                    let placeholder = [agentId, data.opportunity_name, data.pipeline, data.stage, data.lead_value, data.contact_id, data.status]
                                    appModel.query(insertSql, placeholder, (err1, rows1) => {
                                        if (err1) {
                                            res.json({ 'status': 'error', 'message': err1 });
                                        }
                                        else {
                                            //UPDATE CONTACT TYPE
                                            let updateSql = "UPDATE contacts SET contact_type=? WHERE id=?";
                                            appModel.query(updateSql, [3, data.contact_id], (err2, rows2) => {
                                            });
                                            res.status(200).json({ 'status': 'success' });
                                        }
                                    });
                                }

                            }
                        });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    move_contact_to_dnd: async (req, res, next) => {
        let agentId = req.params.agentId
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.action) !== 'undefined' && data.action == 'move_to_dnd') {

            //CHECK EXISTING CONTACTS
            let sqlQuery = "SELECT id FROM contacts WHERE id=?";
            appModel.query(sqlQuery, [data.contact_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Contact not exists" });
                    }
                    else {
                        let updateSql = "UPDATE contacts SET contact_type=?, dnd_date=now() WHERE id=?";
                        let placeholder = [2, data.contact_id];
                        appModel.query(updateSql, placeholder, (err1, rows1) => {
                            if (err1) {
                                res.json({ 'status': 'error', 'message': err1 });
                            }
                            else {
                                res.status(200).json({ 'status': 'success' });
                            }
                        });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },


    send_bulk_messages: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.contact_ids) !== 'undefined' && data.contact_ids.length > 0 && typeof (data.conversation_text) !== 'undefined' && data.conversation_text !== '' && typeof (data.conversation_type) !== 'undefined' && data.conversation_type !== '') {

            let counter = 0;
            let contact_ids = data.contact_ids;
            for (let i = 0; i < contact_ids.length; i++) {
                let insertSql = "INSERT INTO conversations SET agent_id=?, contact_id=?, conversation_type=?, conversation_text=?, posted_by=?, createdAt=now()";
                let placeholder = [data.agent_id, contact_ids[i], data.conversation_type, data.conversation_text, 'Agent'];
                appModel.query(insertSql, placeholder, (err1, rows1) => {
                    if (err1) {
                        counter++;
                        if (counter >= contact_ids.length) {
                            res.json({ 'status': 'error', 'message': err1 });
                        }

                    }
                    else {
                        counter++;
                        //SEND SMS
                        let conLastId = rows1.insertId;
                        console.log("result===", data.conversation_type)
                        if (data.conversation_type == 'Sms') {
                            let sqlQuery = "SELECT id, first_name, email, phone_number FROM contacts WHERE id=?";
                            appModel.query(sqlQuery, [contact_ids[i]], (err2, result) => {
                                if (err2) {
                                    res.json({ 'status': 'error', 'message': err });
                                }
                                else {
                                    console.log("SMS result===", data.conversation_text)
                                    if (result && result.length > 0) {
                                        sendSMSToLead(result[0]['phone_number'], data.conversation_text, conLastId);
                                    }
                                    else {
                                        sendEmailToLead(result[0]['first_name'], result[0]['email'], data.conversation_text, conLastId);
                                    }
                                }
                            });
                        }
                        else {
                            let sqlQuery = "SELECT id, first_name, email, phone_number FROM contacts WHERE id=?";
                            appModel.query(sqlQuery, [contact_ids[i]], (err2, result) => {
                                if (err2) {
                                    res.json({ 'status': 'error', 'message': err });
                                }
                                else {

                                    console.log("Email result===", data.conversation_text)
                                    if (result && result.length > 0) {
                                        sendEmailToLead(result[0]['first_name'], result[0]['email'], data.conversation_text, conLastId);
                                    }
                                }
                            });
                        }

                        if (counter >= contact_ids.length) {
                            res.status(200).json({ 'status': 'success' });
                        }
                    }
                });
            }
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },


    group_contact_to_dnd: async (req, res, next) => {
        let agentId = req.params.agentId
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_ids) !== 'undefined' && data.contact_ids.length > 0 && typeof (data.action) !== 'undefined' && data.action == 'move_to_dnd') {
            let counter = 0;
            let contact_ids = data.contact_ids;
            for (let i = 0; i < contact_ids.length; i++) {
                let updateSql = "UPDATE contacts SET contact_type=?, dnd_date=now() WHERE id=?";
                let placeholder = [2, contact_ids[i]];
                appModel.query(updateSql, placeholder, (err1, rows1) => {
                    if (err1) {
                        counter++;
                        if (counter >= contact_ids.length) {
                            res.json({ 'status': 'error', 'message': err1 });
                        }

                    }
                    else {
                        counter++;
                        if (counter >= contact_ids.length) {
                            res.status(200).json({ 'status': 'success' });
                        }
                    }
                });
            }

        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    update_user_tags: async (req, res, next) => {
        let agentId = req.params.agentId
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.tags) !== 'undefined' && typeof (data.action) !== 'undefined' && data.action == 'update_user_tags') {

            let updateSql = "UPDATE contacts SET tags=? WHERE id=?";
            let placeholder = [data.tags, data.contact_id];
            appModel.query(updateSql, placeholder, (err1, rows1) => {
                if (err1) {
                    res.json({ 'status': 'error', 'message': err1 });

                }
                else {
                    res.status(200).json({ 'status': 'success' });
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },


    update_opportunity_stages: async (req, res, next) => {
        let agentId = req.params.agentId
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.opportunity_id) !== 'undefined' && data.opportunity_id !== '' && typeof (data.opp_stage) !== 'undefined' && data.opp_stage !== '' && typeof (data.action) !== 'undefined' && data.action == 'update_opportunity_stages') {

            let updateSql = "UPDATE opportunities SET opp_stage=? WHERE id=?";
            let placeholder = [data.opp_stage, data.opportunity_id];
            appModel.query(updateSql, placeholder, (err1, rows1) => {
                if (err1) {
                    res.json({ 'status': 'error', 'message': err1 });

                }
                else {
                    let insertSql = "INSERT INTO user_notes SET agent_id=?, contact_id=?, description=?, createdAt=now()";
                    let message = "Updated the stage to " + data.opp_stage;
                    let placeholder = [data.agent_id, data.contact_id, message];
                    appModel.query(insertSql, placeholder, (err1, rows1) => {
                    });
                    res.status(200).json({ 'status': 'success' });
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },



    get_opportunities: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '') {

            let searchSql = '';
            if (typeof (data.search_type) !== 'undefined' && data.search_type !== '') {
                searchSql = " AND opp.opp_stage='" + data.search_type + "' ";
            }
            let sqlQuery = "SELECT u.first_name, u.last_name, u.email, u.phone_number, u.state, u.address, opp.* from opportunities as opp INNER JOIN contacts as u on opp.contact_id=u.id WHERE opp.agent_id=? " + searchSql + " ORDER BY opp.id DESC";
            appModel.query(sqlQuery, [data.agent_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'success', 'message': "success", 'data': [] });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },


    get_single_contact: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '') {
            let sqlQuery = "SELECT id, email, first_name, last_name, phone_number, state, address, stage, tags, city, post_code, campaign, DATE_FORMAT(follow_up_date, '%Y-%m-%d') as follow_up_date  from contacts WHERE id=? AND user_fid=?";
            appModel.query(sqlQuery, [data.contact_id, data.agent_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown user" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    get_single_opportunities: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.opportunity_id) !== 'undefined' && data.opportunity_id !== '') {
            let sqlQuery = "SELECT u.first_name, u.last_name, u.email, u.phone_number, u.state, u.address, opp.* from opportunities as opp INNER JOIN contacts as u on opp.contact_id=u.id WHERE opp.id=?";
            appModel.query(sqlQuery, [data.opportunity_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'success', 'message': "success", 'data': [] });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    create_new_note: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.description) !== 'undefined' && data.description !== '') {

            let insertSql = "INSERT INTO user_notes SET agent_id=?, contact_id=?, description=?, createdAt=now()";

            appModel.query(insertSql, [data.agent_id, data.contact_id, data.description], (err, rows) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    let sqlQuery = "SELECT t.id, t.agent_id, t.contact_id, t.description, DATE_FORMAT(t.createdAt, '%d/%b %l:%i %p') as createdAt, CONCAT(c.first_name,' ',c.last_name) as contact_name, CONCAT(u.first_name,' ',u.last_name) as agent_name from user_notes  as t INNER JOIN contacts as c ON c.id=t.contact_id INNER JOIN users as u ON u.id=t.agent_id WHERE t.id=?";
                    appModel.query(sqlQuery, [rows.insertId], (err, result) => {
                        if (err) {
                            res.json({ 'status': 'error', 'message': err });
                        }
                        else {
                            if (result && result.length == 0) {
                                res.json({ 'status': 'error', 'message': "Unknown detail" });
                            } else {
                                res.status(200).json({ 'status': 'success', 'data': result[0] });
                            }
                        }
                    });
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    create_new_task: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.description) !== 'undefined' && data.description !== '' && typeof (data.task_date) !== 'undefined' && data.task_date !== '') {

            let insertSql = "INSERT INTO user_tasks SET agent_id=?, contact_id=?, description=?, task_date=?, task_type=?, task_status=?, createdAt=now()";

            appModel.query(insertSql, [data.agent_id, data.contact_id, data.description, data.task_date, data.task_type, 1], (err, rows) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    let sqlQuery = "SELECT t.id, t.agent_id, t.contact_id, t.task_status, t.task_type, t.description, t.createdAt, DATE_FORMAT(t.task_date, '%d %b, %Y') as task_date, CONCAT(c.first_name,' ',c.last_name) as contact_name from user_tasks  as t LEFT JOIN contacts as c ON c.id=t.contact_id WHERE t.id=?";
                    appModel.query(sqlQuery, [rows.insertId], (err, result) => {
                        if (err) {
                            res.json({ 'status': 'error', 'message': err });
                        }
                        else {
                            if (result && result.length == 0) {
                                res.json({ 'status': 'error', 'message': "Unknown detail" });
                            } else {
                                res.status(200).json({ 'status': 'success', 'data': result[0] });
                            }
                        }
                    });
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    list_all_task: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '' && typeof (data.selectedDate) !== 'undefined' && data.selectedDate !== '') {
            let sqlQuery = "SELECT t.id, t.agent_id, t.contact_id, t.task_status, t.description, t.task_type, DATE_FORMAT(t.task_date, '%d %b, %Y') as task_date, CONCAT(c.first_name,' ',c.last_name) as contact_name from user_tasks  as t INNER JOIN contacts as c ON c.id=t.contact_id WHERE t.agent_id=? AND task_date=? ORDER BY t.id DESC";
            appModel.query(sqlQuery, [data.agent_id, data.selectedDate], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown detail" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    delete_task: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.task_id) !== 'undefined' && data.task_id !== '' && typeof (data.action) !== 'undefined' && data.action == 'delete_task') {
            let sqlQuery = "DELETE FROM user_tasks WHERE id=?";
            appModel.query(sqlQuery, [data.task_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown detail" });
                    } else {
                        res.status(200).json({ 'status': 'success' });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    close_task: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.task_id) !== 'undefined' && data.task_id !== '' && typeof (data.action) !== 'undefined' && data.action == 'close_task') {
            let sqlQuery = "UPDATE user_tasks SET task_status=? WHERE id=?";
            appModel.query(sqlQuery, [data.status, data.task_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown detail" });
                    } else {
                        res.status(200).json({ 'status': 'success' });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    list_all_notes_for_contact: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '') {
            let sqlQuery = "SELECT t.id, t.agent_id, t.contact_id, t.description, DATE_FORMAT(t.createdAt, '%d/%b %l:%i %p') as createdAt, CONCAT(c.first_name,' ',c.last_name) as contact_name, CONCAT(u.first_name,' ',u.last_name) as agent_name FROM user_notes as t INNER JOIN contacts as c ON c.id=t.contact_id INNER JOIN users as u ON u.id=t.agent_id WHERE t.contact_id=? AND t.agent_id=? ORDER BY t.id ASC";
            appModel.query(sqlQuery, [data.contact_id, data.agent_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown detail" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    list_task_by_contact_id: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.agent_id) !== 'undefined' && data.agent_id !== '') {
            let sqlQuery = "SELECT t.id, t.agent_id, t.contact_id, t.description, t.task_type, DATE_FORMAT(t.task_date, '%d %b, %Y') as task_date, CONCAT(c.first_name,' ',c.last_name) as contact_name FROM user_tasks as t INNER JOIN contacts as c ON c.id=t.contact_id WHERE t.contact_id=? AND t.agent_id=? AND t.task_status=1 ORDER BY t.id DESC";
            appModel.query(sqlQuery, [data.contact_id, data.agent_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Unknown detail" });
                    } else {
                        res.status(200).json({ 'status': 'success', 'data': result });
                    }
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    emailSignature: async (req, res, next) => {
        let agentId = req.params.getAgent_id;
        let post = req.body;

        if (post.ckData == "EmptyckDataIshrere") {
            let sql = `Select * from users_signature where user_fid = ${agentId}`;
            appModel.query(sql, (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    res.status(200).json({ 'status': 'success', 'data': result[0] });
                }
            })

        } else {
            let sql = `Select * from users_signature where user_fid = ${agentId}`
            appModel.query(sql, (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    let sql = '';
                    let placeholder = '';
                    if (result && result.length == 0) {
                        sql = "INSERT INTO users_signature SET enable_signature=?, show_quote=?, message=?, user_fid=?";
                        placeholder = [post.esignature, post.quotedtext, post.ckData, agentId]
                        appModel.query(sql, placeholder, (err, result) => {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            } else {
                                res.status(200).json({ 'status': 'success', 'data': result[0] });
                            }
                        })
                    } else {
                        sql = "UPDATE users_signature SET enable_signature=?, show_quote=?, message=? WHERE user_fid=?";
                        placeholder = [post.esignature, post.quotedtext, post.ckData, agentId]
                        appModel.query(sql, placeholder, (err, result) => {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            } else {
                                res.status(200).json({ 'status': 'success', 'data': result[0] });
                            }
                        })
                    }
                }
            })
        }
    },

    emailVerify: async (req, res, next) => {
    
        let post = req.body;
    console.log(post,'req.body')
        if (typeof (post) !== 'undefined' && typeof (post.email) !== "undefined" && post.email !== '') {
            let sql = "SELECT * FROM users WHERE email = ?";
            let placeholder = [post.email];
            appModel.query(sql, placeholder, (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'failed', 'message': "Please enter registered email address" });
                    } else {
                        let agentId = result[0].id;
                        let sql = `SELECT * FROM forget_password WHERE users_fid = ${agentId}`;
                        appModel.query(sql, (err, result1) => {
                            if (err) {
                              console.log(err,'err1')
                                res.json({ 'status': 'error', 'message': err });
                            } else {
                                function generateRandomNumber() {
                                    var minm = 100000;
                                    var maxm = 999999;
                                    return Math.floor(Math
                                        .random() * (maxm - minm + 1)) + minm;
                                }
                                let output = generateRandomNumber();
                                let sql = '';
                                if (result1 && result1.length == 0) {
                                    sql = "INSERT INTO forget_password SET users_fid = ?, code = ?";
                                    let placeholder = [agentId, output];
                                    appModel.query(sql, placeholder, (err, result2) => {
                                        if (err) {
                                        console.log(err,'err2')
                                            res.json({ 'status': 'error', 'message': err });
                                        } else {
                                        console.log(result2,'result')
                                            nodeMailler();
                                        }
                                    })
                                } else {
                                    sql = "Update forget_password SET code = ? WHERE users_fid = ?";
                                    let placeholder = [output, agentId];
                                    appModel.query(sql, placeholder, (err, result) => {
                                        if (err) {
                                          console.log(err,'err3')
                                            res.json({ 'status': 'error', 'message': err });
                                        } else {
                                          console.log('2222')
                                            nodeMailler();
                                        }
                                    })
                                }

                                async function nodeMailler() {
                                    let sql = "Select * from forget_password where users_fid = ?";
                                    let placeholder = [agentId];
                                    appModel.query(sql, placeholder, async (err, result) => {
                                        if (err) {
                                            res.json({ 'status': 'error', 'message': err });
                                        } else {
                                            let sixDigitCode = result[0].code;
                                            // nodemailler code is here

                                            var data = {
                                                to: post.email,
                                                code: sixDigitCode,
                                                message: "Your Six Digit Code To Change The Password .",
                                                subject: "Change Password",
                                            };

                                            await fun.sendEmail(
                                                req,
                                                res,
                                                data,
                                                "../../views/email_templates/change_password.html"
                                            );

                                            res.json({ 'status': 'success', 'message': "Code is send to your registered email address" });
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            })
        }
    },

    codeVerify: async (req, res, next) => {
        let post = req.body;
        if (typeof (post) !== 'undefined' && typeof (post.code) !== "undefined" && post.code !== '') {
            let sql = "select * from forget_password where code = ?";
            let placeholder = [post.code];
            appModel.query(sql, placeholder, (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    if (result && result.length == 0) {
                        res.json({ 'status': 'error', 'message': "Code doesn't matched" });
                    } else {
                        let getAgentId = result[0].users_fid;
                        let sql = "select * from users where id= ?";
                        let placeholder = [getAgentId];
                        appModel.query(sql, placeholder, (err, result) => {
                            if (err) {
                                res.json({ 'status': 'error', 'message': err });
                            } else {
                                if (result && result.length == 0) {
                                    res.json({ 'status': 'error', 'message': "Agent not found" });
                                } else {
                                    res.json({ 'statuss': 'success', 'message': "User Found", "userId": getAgentId })
                                };
                            }
                        })
                    }
                }
            })
        }
    },

    update_follow_up_date: async (req, res, next) => {
        let data = req.body;
        if (typeof (data) !== 'undefined' && typeof (data.contact_id) !== 'undefined' && data.contact_id !== '' && typeof (data.follow_up_date) !== 'undefined' && data.follow_up_date !== '') {
            let sqlQuery = "UPDATE contacts set follow_up_date=? WHERE id=?";
            appModel.query(sqlQuery, [data.follow_up_date, data.contact_id], (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    res.status(200).json({ 'status': 'success' });
                }
            });
        }
        else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },

    sms_webhook_call: async (req, res, next) => {
        let data = req.body;

        var getid = req.params.con_id
        console.log("CON ID===" + getid);
        console.log("SMS WEB HOOK", data);
        if (data && Object.keys(data).length > 0) {
            //SEARCH CONTACT
            let sqlQuery = "SELECT * FROM contacts WHERE REPLACE(phone_number, '+1 ', '+1') =?";
            let search = [data.From];
            appModel.query(sqlQuery, search, (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                }
                else {
                    if (result && result.length > 0) {

                        let sql1 = "SELECT * FROM conversations WHERE contact_id=? AND conversation_type='Sms' ORDER BY id DESC LIMIT 0,1";
                        let search1 = [result[0]['id']];
                        appModel.query(sql1, search1, (err1, result1) => {
                            if (err1) {
                                res.json({ 'status': 'error', 'message': err1 });
                            }
                            else {
                                if (result1 && result1.length > 0) {
                                    let insertSql = "INSERT INTO conversations SET agent_id=?, contact_id=?, conversation_type=?,conversation_text=?,posted_by=?,message_sid=?,createdAt=now()";
                                    let insertPlaceHolder = [result1[0]['agent_id'], result1[0]['contact_id'], 'Sms', data.Body, 'Contact', data.MessageSid];
                                    appModel.query(insertSql, insertPlaceHolder, (err2, result2) => {
                                        if (err2) {
                                            res.json({ 'status': 'error', 'message': err2 });
                                        }
                                        else {
                                            res.status(200).json({ 'status': 'success' });
                                        }
                                    });

                                }
                                else {
                                    res.status(200).json({ 'status': 'error no record in conversations' });
                                }

                            }
                        });

                    }
                    else {
                        res.status(200).json({ 'status': 'error c' });
                    }
                }
            });
        }
        else {
            res.status(200).json({ 'status': 'error l' });
        }
    },

    test_api: async (req, res, next) => {
        let conId = 1;
        let callbackUrl = global.SITE_URL + "api/sms_webhook_call/" + conId;
        console.log("SMS WEB HOOK", callbackUrl);
        res.send(callbackUrl);
    },

    receive_email: async (req, res, next) => {
        let data = req.body;
       

        return new Promise((resolve, reject) => {
            let reference = data.Headers.find(function(value,index) {
                                                return value.Name == 'References'
                                            });
            
            if (typeof reference != "undefined") {
                reference = reference.Value.split("@")[0];
                reference = reference.replace('<','');
                reference = reference.replace('mailto:','');
            } else {
                reference = "";
            }           
            let from = data.From.replace('mailto:','');
            //let attachment = (data.Attachments.length > 0)?JSON.stringify(data.Attachments):'';

            console.log("reference",reference)

            let query = "SELECT * FROM conversations WHERE email_message_id=?";
            appModel.query(query, [reference],async (error, result) => {
                if (error) {
                     res.status(200).json({ 'status': 'Error' }); 
                } else {
                    if(result && result.length>0) {
                        const query = 'INSERT INTO conversations SET agent_id=?, contact_id=?, conversation_type=?, conversation_text=?, posted_by=?, read_status=?, createdAt=now()';
                        appModel.query(query, [result[0]['agent_id'],result[0]['contact_id'],'Email', data.StrippedTextReply,'Contact',0],async (error1, result1) => {
                            if (error1) {
                                console.log("error1",error1)
                                res.status(200).json({ 'status': 'Error' }); 
                            } else {
                                res.status(200).json({ 'status': 'Success' }); 
                            }
                        });
                    }
                    else {
                        res.status(200).json({ 'status': 'Error' }); 
                    }
                }
            }); 
        })
    },

    changereadStatus: async (req, res, next) => {
        let data = req.body
        console.log(data);
        if (typeof(data)!== 'undefined' && typeof(data.id)!== 'undefined' && data.id!=='') {
            let sql = "UPDATE conversations SET read_status=? WHERE id=?";
            let placeholder = [1, data.id];
            appModel.query(sql, placeholder, (err, result) => {
                if (err) {
                    res.json({ 'status': 'error', 'message': err });
                } else {
                    res.status(200).json({ 'status': 'success', 'data': 'success' });
                }
            })
        } else {
            res.json({ 'status': 'error', 'message': "invalid request" });
        }
    },



};