# COG-Explorer

This is the repository for the COG-Explorer app.

## Setup

To set everything up run:

    npm install

## Building

To build the application bundle run:

    npm run build

The bundle is now available in the `dist` directory.

## Deployment

To deploy the app on github pages first commit the built bundle:

    git commit dist/ -m "Updating bundle."

Now run this command to deploy on github pages:

    npm run deploy

Note: the `gh-pages` branch must be present and you have to have write access to your remote.