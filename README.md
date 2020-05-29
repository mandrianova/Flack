# Project 2 - Flack

Web Programming with Python and JavaScript

[Project on Heroku](https://flack-mandrianova.herokuapp.com/)

[Video on YouTube](https://youtu.be/MmLte1ii_5A)

I added gunicorn and eventlet in requirements and Procfile for deploying.

## The chat possibilities

- 100 users, 100 channels with 100 messages.
- Saving info only on server memory without DB.
- Communications user to user and users in channels.
- Deleting your own messages.

## Structure of project

- Bootstrap for templates + custom CSS in the [static](static) directory.
- [Templates](templates). [Base.html](templates/base.html) for head, [index.html](templates/index.html) for the general template.
- Bootstrap.js and Jquery.js for templates (bootstrap requirements). Moment.js library for date and time. [Index.js](static/js/index.js) - the general frontend logic of the application. I used socket.io and ajax for requests.
- [App.py](app.py) - the general backend logic of tha application.





