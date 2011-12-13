#!/usr/bin/env python

import os
import sys
import json
import time
import base64
import getopt
import os.path
import httplib
import mimetypes

# main settings, change per project
app = 'blogsearch'

# optionally change these settings
data = 'data'
settings = 'conf'
ctype = 'blogpost'
resources = { 
    'css': {'binary': False},
    'js': {'binary': False},
    'images': {'binary': True},
    'html': {'binary': False}
}

# installer settings, do not change
c9host = 'localhost'
c9port = '2600'
c9path = ''

app_settings = {u'mappings': {u'images': {u'properties': {u'code': {u'index': u'no', u'type': u'binary', u'store': u'no'}, u'mime': {u'index': u'no', u'type': u'string', u'store': u'no'}}, u'_source': {u'enabled': True, u'compress': True}}, u'html': {u'properties': {u'code': {u'index': u'no', u'type': u'string', u'store': u'no'}, u'mime': {u'index': u'no', u'type': u'string', u'store': u'no'}}, u'_source': {u'enabled': True, u'compress': True}}, u'css': {u'properties': {u'code': {u'index': u'no', u'type': u'string', u'store': u'no'}, u'mime': {u'index': u'no', u'type': u'string', u'store': u'no'}}, u'_source': {u'enabled': True, u'compress': True}}, u'js': {u'properties': {u'code': {u'index': u'no', u'type': u'string', u'store': u'no'}, u'mime': {u'index': u'no', u'type': u'string', u'store': u'no'}}, u'_source': {u'enabled': True, u'compress': True}}}, u'settings': {u'index': {u'number_of_replicas': 1, u'number_of_shards': 1}}}

usage = \
        \
"""
Usage: install [options]

Options:
    -h HOST         Set the hostname, default: localhost
    -p PORT         Set the port, default: 2600
    -u PATH         Set the path to Cloud9, default: /
"""

def http(method, path, body):
    """ Executes a HTTP request with the given method, path, and body """
    print '%s %s' % (method, '%s:%s%s%s' % (c9host, c9port, c9path, path))
    connection =  httplib.HTTPConnection('%s:%s' % (c9host, c9port))
    connection.request(method, '%s/api%s' % (c9path, path), body)
    return connection.getresponse()

def install_app():
    """ Installs the Cloud9 App """
    print 'Installing Cloud9 App: %s' % app
    http('POST', '/%s.app' % app, json.dumps(app_settings))

    for resource_dir in resources:
        print 'Checking for resources: %s' % resource_dir
        if not os.path.isdir(resource_dir):
            continue

        for resource in os.listdir(resource_dir):
            rpath = os.path.join(resource_dir, resource)
            print 'Found %s' % rpath
            rdata = open(rpath, 'rb').read()
            try:
                if resources[resource_dir]['binary']:
                    print 'Base64 encoding %s' % rpath
                    rdata = base64.b64encode(rdata)
            except KeyError:
                pass

            rdoc = {'code': rdata, 'mime': mimetypes.guess_type(resource)[0]}
            http('PUT', '/%s.app/%s' % (app, rpath), json.dumps(rdoc))

def configure_app():
    """ Configures any types and mappings required by the Cloud9 App """
    print 'Configuring Cloud9 App: %s' % app
    http('PUT', '/demos/', '')
    mappings_path = os.path.join(settings, '%s.json' % app)
    if os.path.exists(mappings_path):
        print 'Found mappings: %s' % mappings_path
        mappings = open(mappings_path, 'rb').read()
        http('PUT', '/demos/%s/_mapping' % ctype if ctype is not None else app, mappings)

def install_data():
    """ Indexes any data needed for the Cloud9 App """
    if os.path.isdir(data):
        print 'Looking for data files in %s' % data
        for dfile in os.listdir(data):
            dpath = os.path.join(data, dfile)
            print 'Found data file: %s' % dpath
            ddata = open(dpath, 'rb').read()
            http('PUT', '/_bulk', ddata)

if __name__ == '__main__':
    try:
        opts, args = getopt.getopt(sys.argv[1:], "h:p:u:")
    except:
        print usage
        sys.exit(1)
    else:
        for option, arg in opts:
            if option == '-h':
                c9host = arg
            elif option == '-p':
                c9port = arg
            elif option == '-u':
                c9path = arg

    
        install_app()
        configure_app()
        install_data()
