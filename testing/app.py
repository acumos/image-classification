#!/usr/bin/env python3
import connexion
import datetime
import logging

from connexion import NoContent
import argparse
from functools import partial

import requests
from flask import Flask, request, current_app

from cognita_client.wrap.load import load_model
import pandas as pd

#def invoke_method(model_method):
def transform(mime_type, image_binary):
    app = current_app
    # exists = pet_id in PETS
    # pet['id'] = pet_id
    # if exists:
    #     logging.info('Updating pet %s..', pet_id)
    #     PETS[pet_id].update(pet)
    # else:
    #     logging.info('Creating pet %s..', pet_id)
    #     pet['created'] = datetime.datetime.utcnow()
    #     PETS[pet_id] = pet

    image_read = image_binary.stream.read()
    X = pd.DataFrame([['image/jpeg', image_read]], columns=['mime_type', 'binary_stream'])

    pred = app.model.transform.from_native(X).as_native()
    print(type(pred))
    print(pred)

    # resp = target_model.transform.from_native(X)
    # pred = resp.as_native()
    #
    # outC = os.path.join(tdir, "{}.class.csv".format(fileKey))
    # pred.to_csv(outC)
    # print("{:} -> {:}".format(train_path, pred))

    return 'OK', 201


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8885)
    parser.add_argument("--modeldir", type=str, default='../model')
    pargs = parser.parse_args()

    print("Configuring local application... {:}".format(__name__))
    logging.basicConfig(level=logging.INFO)
    app = connexion.App(__name__)
    app.add_api('swagger.yaml')
    # set the WSGI application callable to allow using uWSGI:
    # uwsgi --http :8080 -w app
    # application = app.app

    print("Loading model... {:}".format(pargs.modeldir))
    app.app.model = load_model(pargs.modeldir)  # refers to ./model dir in pwd. generated by helper script also in this dir
    """
    # dynamically add handlers depending on model capabilities
    for method_name, method in model.methods.items():
        url = "/{}".format(method_name)
        print("Adding route {}".format(url))
        handler = partial(invoke_method, model_method=method)
        app.add_url_rule(url, method_name, handler, methods=['POST'])
    """

    # run our standalone gevent server
    app.run(port=pargs.port) #, server='gevent')
