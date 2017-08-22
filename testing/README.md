# web_test
This directory provides a simple web server for demonstrating an image-based classifier example.
This web demo will launch an application with a swagger page.

## Example usage

```
$ python app.py

usage: app.py [-h] [--port PORT] [--modeldir MODELDIR]

optional arguments:
  -h, --help           show this help message and exit
  --port PORT
  --modeldir MODELDIR
```

## Image Classifier Evaluation

* For a graphical experience, view the swagger-generated UI at [http://localhost:8885/ui].
* Additionally, a simple command-line utility could be used to post an image
and mime type to the main interface.
```
curl -F image_binary=@test.jpg -F mime_type="image/jpeg" "http://localhost:8885/transform"
```