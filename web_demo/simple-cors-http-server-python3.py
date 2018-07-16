#!/usr/bin/env python3
# Trivial HTTP server that sets an anything-goes CORS header
# Defaults to port 8000; accepts alternate port number as sole argument
# https://stackoverflow.com/questions/21956683/enable-access-control-on-simple-http-server

from http.server import HTTPServer, SimpleHTTPRequestHandler, test
import sys

class CORSRequestHandler (SimpleHTTPRequestHandler):
    def end_headers (self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    test(CORSRequestHandler, HTTPServer, port=port)
