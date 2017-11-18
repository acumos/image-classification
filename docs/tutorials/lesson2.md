# Application Server
As a means of testing the API and demonstrating functionality, two
additional components are included in this repository:
a simple [swagger-based webserver](../../testing) (documented here) and
a [demo web page](../../web_demo) (documented in the [next tutorial](lesson3.md).

## Swagger API
Using a simple [flask-based connexion server](https://github.com/zalando/connexion),
an API scaffold has been built to host a serialized/dumped model.

To utilized [this example app](../../testing), an instance should first be built and downloaded
from Acumos (or dumped to disk) and then
launched locally.  Afterwards, the sample application found in
[web_demo](web_demo) (see [the next tutorial](lesson3.md))
uses a `localhost` service to classify
and visualize the results of image classification.

```
usage: app.py [-h] [--port PORT] [--modeldir MODELDIR]

optional arguments:
  -h, --help           show this help message and exit
  --port PORT          port to launch the simple web server
  --modeldir MODELDIR  model dir to load dumped artifact
```

Example usage may be running with a model that was dumped to the directory `model`
in the main repo source directory.

```
python app.py --modeldir ../model --port 8885
```


### Output formats
The optional HTTP parameter `rich_output` will generate a more decorated JSON output
 that is also understood by the included web application.

* standard output - from `DataFrame` version of the prediction
```
[
    {
        "tag": "Model T",
        "score": 0.9676347970962524,
        "image": 0
    },
    {
        "tag": "thresher, thrasher, threshing machine",
        "score": 0.0003279313677921891,
        "image": 0
    },
    {
        "tag": "tow truck, tow car, wrecker",
        "score": 0.00028412468964233994,
        "image": 0
    },
    ...
    {
        "tag": "dragonfly, darning needle, devil's darning needle, sewing needle, snake feeder, snake doctor, mosquito hawk, skeeter hawk",
        "score": 8.805734978523105e-05,
        "image": 0
    }
]

```


* rich output - formatted form of the prediction
```
{
    "results": {
        "status": "Succeeded",
        "clientfile": "undefined",
        "info": "Processed",
        "classes": [
            {
                "score": 0.9676347970962524,
                "rank": 0,
                "tag": "Model T",
                "image": 0
            },
            {
                "score": 0.0003279313677921891,
                "rank": 1,
                "tag": "thresher, thrasher, threshing machine",
                "image": 0
            },
            ...
            {
                "score": 8.805734978523105e-05,
                "rank": 29,
                "tag": "dragonfly, darning needle, devil's darning needle, sewing needle, snake feeder, snake doctor, mosquito hawk, skeeter hawk",
                "image": 0
            }
        ],
        "serverfilename": "/dev/null",
        "processingtime": 3.4256299999999555
    }
}
```

## Image Classifier Evaluation

* For a graphical experience, view the swagger-generated UI at [http://localhost:8885/ui].
* Additionally, a simple command-line utility could be used to post an image
and mime type to the main interface.
```
curl -F image_binary=@test.jpg -F rich_output="true" -F mime_type="image/jpeg" "http://localhost:8885/classify"
```

