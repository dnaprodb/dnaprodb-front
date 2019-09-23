#!/home/conda/bin/python

#  Copyright 2019, Jared Sagendorf, All rights reserved.
#  
#  Correspondance can be sent by e-mail to Jared Sagendorf <sagendor@usc.edu>
#  
#  This program is free software; you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation; either version 2 of the License, or
#  (at your option) any later version.
#  
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.

import cgi
import cgitb
import sys
import smtplib
import json

UPLOAD_PATH = "/srv/www/dnaprodb.usc.edu/htdocs/uploads"

# Load sensitive data
with open("../.sensitive.json") as FH:
    sensitive = json.load(FH)
    
def send_email(TO, SUBJECT, TEXT):
    sender_email = sensitive["dnaprodb_email_name"]
    sender_passw = sensitive["dnaprodb_email_pass"]
    RECV = [TO, sensitive["usc_email_name"]]
    
    # Send notification E-mail
    MESSAGE = "To: %s\r\n" % TO + "Subject: %s\r\n" % SUBJECT + "\r\n" + TEXT
    
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.ehlo()
    server.starttls()
    server.login(sender_email, sender_passw)
    server.sendmail(sender_email, RECV, MESSAGE)
    server.close()

# Begin Script
FILE_NAME = sys.argv[1]
with open("{}/{}.json".format(UPLOAD_PATH, FILE_NAME)) as JSON_FILE:
    DATA = json.load(JSON_FILE)

with open("{}/{}-info.json".format(UPLOAD_PATH, FILE_NAME)) as META_FILE:
    META = json.load(META_FILE)

if('error' in DATA):
    if(META['title'] != 'none'):
        subject = "DNAproDB: Your job request ({}) has failed.".format(META['title'])
    else:
        subject = "DNAproDB: Your job request has failed."
    text = """\
Unfortunately your job request has failed. The following error message may provide some insight as to why: \
    
{}: {}
    
If you need assistance, please contact us through our contact page (http://dnaprodb.usc.edu/cgi-bin/contact).
""".format(DATA['error'], DATA['message'])
else:
    if(META['title'] != 'none'):
        subject = "DNAproDB: Your job request ({}) is ready.".format(META['title'])
        text = """\
    Your job request has been successfully processed and is available at http://dnaprodb.usc.edu/cgi-bin/report?jobid={}&title={} \
    If you wish to keep your data private and secure, do not share this url with other people.
    
    DNAproDB will never share any data which is uploaded to our server, nor do we collect any information from your data. We hope you will find \
    our tools useful. If you have any comments about DNAproDB, please let us know through our contact page (http://dnaprodb.usc.edu/cgi-bin/contact).\
    """.format(FILE_NAME, META['title'])
    else:
        subject = "DNAproDB: Your job request is ready."
        text = """\
    Your job request has been successfully processed and is available at http://dnaprodb.usc.edu/cgi-bin/report?jobid={} \
    If you wish to keep your data private and secure, do not share this url with other people.
    
    DNAproDB will never share any data which is uploaded to our server, nor do we collect any information from your data. We hope you will find \
    our tools useful. If you have any comments about DNAproDB, please let us know through our contact page (http://dnaprodb.usc.edu/cgi-bin/contact).\
    """.format(FILE_NAME)

send_email(META['email'], subject, text)


