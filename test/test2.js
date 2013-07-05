/*jslint node:true, nomen:true */
var ms = require('../lib/index'), _ = require('underscore'), nodeunit = require('nodeunit'), mailer = require('emailjs'), mailPort = 4025, 
mailServer, testFn, sendmail, from = "smtpmailtest@gmail.com", smtpTransport, setUp, tearDown, casedown;

casedown = function (obj) {
	_.each(obj,function (v,k) {
		obj[k.toLowerCase()] = v;
	});
	return(obj);
};
setUp = function (callback) {
	smtpTransport = mailer.server.connect({
		host: "localhost",
		port: mailPort,
		domain: "localhost.local"
	});
	mailServer = ms.init(mailPort);
	callback();
};
tearDown = function (callback) {
	mailServer.stop(callback);
	//smtpTransport.close();
};
sendmail = function(to,subject,body,headers,cb) {
	var message;
  if (!cb && typeof(headers) === "function") {
    cb = headers;
    headers = {};
  }
	message = {
		from: from, 
		to:to,
		subject:subject,
		text:body
	};
	_.extend(message,headers||{});
	smtpTransport.send(message,cb);
};



testFn = {
	sendMail: nodeunit.testCase({
		setUp: setUp,
		tearDown: tearDown,
		// not logged in should give unauthenticated
		specificHandler : function(test) {
			var handler, checkDone, count = 0, expected = 2, addr = "foo@gmail.com", subject = "email test", body = "This is a test email";
			checkDone = function () {
				if (++count >= expected) {
					test.done();
				}
			};
			// bind a handler
			handler = function(address,id,email) {
				email.headers = casedown(email.headers);
				test.equal(address,addr,"Should have address sent to handler as '"+addr+"'");
				test.equal(email.body,body,"Body should match");
				test.equal(email.headers.to,addr,"Should have header address To match");
				test.equal(email.headers.from,from,"Should have header address From match");
				checkDone();
			};
			mailServer.bind(addr,handler);
		
			// send out the email with the activation code
			sendmail(addr,subject,body, function(error, response){
				// indicate we are done
				test.equal(null,error,"Should have no error in sending mail");
				if (!!error) {
					test.done();
				} else {
					checkDone();
				}
			});
		},
		catchAllHandler : function(test) {
			var handler, checkDone, count = 0, expected = 2, addr = "foo@gmail.com", subject = "email test", body = "This is a test email";
			checkDone = function () {
				if (++count >= expected) {
					test.done();
				}
			};
			// bind a handler
			handler = function(address,id,email) {
				email.headers = casedown(email.headers);
				test.equal(address,null,"Should have address 'null' sent to handler");
				test.equal(email.body,body,"Body should match");
				test.equal(email.headers.to,addr,"Should have header address To match");
				test.equal(email.headers.from,from,"Should have header address From match");
				checkDone();
			};
			mailServer.bind(handler);
		
			// send out the email with the activation code
			sendmail(addr,subject,body, function(error, response){
				// indicate we are done
				test.equal(null,error,"Should have no error in sending mail");
				if (!!error) {
					test.done();
				} else {
					checkDone();
				}
			});
		},
		foldedHeader: function(test) {
			// this is an issue, we need to test it by forcing actual specific headers down to detail
			var handler, checkDone, count = 0, expected = 2, addr = "foo@gmail.com", subject = "email test", body = "This is a test email",
			xfolded = "This is a\r\n  folded header", xfoldedtab = "This is a\r\n\t tab folder header";
			checkDone = function () {
				if (++count >= expected) {
					test.done();
				}
			};
			// bind a handler
			handler = function(address,id,email) {
				email.headers = casedown(email.headers);
				test.equal(address,addr,"Should have address sent to handler as '"+addr+"'");
				test.equal(email.body,body,"Body should match");
				test.equal(email.headers.to,addr,"Should have header address To match");
				test.equal(email.headers.from,from,"Should have header address From match");
				test.equal(email.headers.xfolded,xfolded.replace(/\r\n\s/,""),"Should have the folded header unfolded");
				test.equal(email.headers.xfoldedtab,xfoldedtab.replace(/\r\n\s/,""),"Should have the tab folded header unfolded");
				checkDone();
			};
			mailServer.bind(addr,handler);
		
			// send out the email with the activation code
			sendmail(addr,subject,body, {xfolded:xfolded,xfoldedtab:xfoldedtab},function(error, response){
				// indicate we are done
				test.equal(null,error,"Should have no error in sending mail");
				if (!!error) {
					test.done();
				} else {
					checkDone();
				}
			});
		}
	}),
	modules: nodeunit.testCase({
		setUp: setUp,
		tearDown: tearDown,
		logAll : function(test) {
			var success, checkDone, count = 0, expected = 2, addr = "foo@gmail.com", subject = "email test", body = "This is a test email", _log = console.log, message;
			message = "From: smtpmailtest@gmail.com\nTo: foo@gmail.com\nSubject: email test\nThis is a test email\n\n";
			
			checkDone = function () {
				if (++count >= expected) {
					test.done();
				}
			};

			// load the module
			success = mailServer.module("logAll");
			test.equal(success,true,"Should have success loading module");
			// send a mail, see that it ends up on the console
			// but first capture the console
			console.log = function(msg) {
			  //_log(msg);
			  if (msg && typeof(msg) === "string") {
          // expect the message - but the date can change, so remove it
          test.equal(msg.replace(/\nDate:.*\nSubject/,"\nSubject"),message,"Should be a specific message");
			  }
				console.log = _log;
				checkDone();
			};

			// send out the email with the activation code
			sendmail(addr,subject,body, function(error, response){
				// indicate we are done
				test.equal(null,error,"Should have no error in sending mail");
				if (!!error) {
					test.done();
				} else {
					checkDone();
				}
			});
		}
	})
};

nodeunit.reporters["default"].run(testFn,null);

