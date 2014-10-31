composite-client
================

Client-side library for connecting to Composite backend service

Installing
----------
Download or clone the ``/build/min/composite.min.js`` into your site. It’s
possible to use RequireJS or Browserify as well (see below). Include the file
like any other script ``<script src=”{directory}/composite.min.js”></script>``.

Using
-----
The ``composite`` file exposes a ``Composite`` constructor that you’ll use to
connect, send messages, and listen for events on. A simple example would be:

.. code:: javascript

    // Instantiate the library, connect, and listen for a response
    var composite = new Composite();
    composite.on(‘init’, function(response) {
        console.log(response);
    });

    composite.connect(‘http://yourUrlHere/composite’);


Documentation
-------------
For complete documentation, view:

* `Installing Composite client
  <http://composite-framework.readthedocs.org/en/latest/doc_sections/installation.html#composite-client>`
* `Composite Client reference <http://composite-framework.readthedocs.org/en/latest/doc_sections/composite-client.html>``

