# Common classes and functions for the library tools.
#
# This module contains:
#   - a function loading the node config
#   - support classes for sending emails (simplifying the use of smtplib)

import logging
import os
import smtplib
import time
import json

from email.MIMEText import MIMEText
from email.MIMEMultipart import MIMEMultipart

CONFIG_DIR = os.path.join(
    os.path.split(os.path.dirname(__file__))[0], 'config')

def get_json_config(env):
    """
    Returns the configuration for the environment 'env' as a dictionary.

    The JSON config may contain comments. Since we only use full-line
    comments, we can filter them out by looking at // at the beginning of
    a line.
    """
    def isComment(line):
        return line.strip().startswith('//')

    configFilename = os.path.join(CONFIG_DIR, '%s.json' % env)
    configFile = open(configFilename)
    config = "".join([
        line for line in configFile.readlines() if not isComment(line)])
    return json.loads(config)


def _ascii(text):
    return text.encode('ascii', 'ignore')

class Email(object):
    """Simple text email that knows how to create the MIME message."""
    def __init__(self, subject=None, recipients=None, sender=None,
                 replyto=None,  text=None, html=None):
        self.recipients = recipients
        self.subject = subject
        self.sender = sender
        self.replyto = replyto
        self.text = text
        self.html = html

    def merge(self, template):
        """Fills missing data from the template email."""
        self.recipients = self.recipients or template.recipients
        self.subject = self.subject or template.subject
        self.sender = self.sender or template.sender
        self.replyto = self.replyto or template.replyto
        self.text = self.text or template.text

    def is_complete(self):
        return self.sender and self.recipients and self.subject and self.text

    def _init_message(self, message):
        assert self.is_complete()
        message["Subject"] = self.subject
        message["From"] = self.sender
        message["To"] = ', '.join(self.recipients)
        message["Reply-To"] = self.replyto
        return message

    def get_text_message(self):
        """Returns this email as a MIMEText object."""
        message = MIMEText(self.text, _charset='utf-8')
        self._init_message(message)
        return message

    def get_message(self):
        """Returns a combined text/html message."""
        if not self.html:
            return self.get_text_message()
        message = MIMEMultipart('alternative')
        self._init_message(message)
        message.attach(MIMEText(self.text, 'plain', _charset='utf-8'))
        message.attach(MIMEText(self.html, 'html', _charset='utf-8'))
        return message


class SmtpClient(object):
    """Sends Emails using an SMTP_SSL client. Opens the SMTP connection
    in the constructor and closes it again in the destructor."""
    def __init__(self, host, port, username, password):
        self.name = "%s@%s:%d" % (username, host, port)
        logging.info("opening SMTP connection %s", self.name)
        self.smtp_client = smtplib.SMTP(host, port)
        self.smtp_client.ehlo()
        self.smtp_client.starttls()
        self.smtp_client.ehlo()
        self.smtp_client.login(username, password)

    def __del__(self):
        logging.info("closing SMTP connection %s", self.name)
        self.smtp_client.quit()

    def send(self, email):
        """Sends the Email object using the SMTP client."""
        logging.info("sending email to %s", email.recipients)
        message = email.get_message()
        self.smtp_client.sendmail(
            email.sender, email.recipients, message.as_string())

