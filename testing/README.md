# web_test
This directory provides a simple web server for demonstrating an image-based classifier example.
This web demo will launch an application with a swagger page.

## Example usage

```
$ python app.py
usage: app.py [-h] [--port PORT] [--modeldir MODELDIR] [--rich_return]

optional arguments:
  -h, --help           show this help message and exit
  --port PORT          port to launch the simple web server
  --modeldir MODELDIR  model directory to load dumped artifact
  --rich_return        output rich JSON instead of direct prediction
```

### Output formats
The optional parameter `--rich_return` will generate a more decorated JSON output
 that is also understood by the included web application.

* standard output - from `DataFrame` version of the prediction
```
[
    {
        "classes": "Model T",
        "predictions": 0.9676347970962524,
        "idx": 0
    },
    {
        "classes": "thresher, thrasher, threshing machine",
        "predictions": 0.0003279313677921891,
        "idx": 0
    },
    {
        "classes": "tow truck, tow car, wrecker",
        "predictions": 0.00028412468964233994,
        "idx": 0
    },
    ...
    {
        "classes": "dragonfly, darning needle, devil's darning needle, sewing needle, snake feeder, snake doctor, mosquito hawk, skeeter hawk",
        "predictions": 8.805734978523105e-05,
        "idx": 0
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
                "class": "Model T"
            },
            {
                "score": 0.0003279313677921891,
                "rank": 1,
                "class": "thresher, thrasher, threshing machine"
            },
            ...
            {
                "score": 8.805734978523105e-05,
                "rank": 29,
                "class": "dragonfly, darning needle, devil's darning needle, sewing needle, snake feeder, snake doctor, mosquito hawk, skeeter hawk"
            }
        ],
        "serverfilename": "/dev/null",
        "processingtime": 3.4256299999999555
    }
}

## Image Classifier Evaluation

* For a graphical experience, view the swagger-generated UI at [http://localhost:8885/ui].
* Additionally, a simple command-line utility could be used to post an image
and mime type to the main interface.
```
curl -F image_binary=@test.jpg -F mime_type="image/jpeg" "http://localhost:8885/transform"
```