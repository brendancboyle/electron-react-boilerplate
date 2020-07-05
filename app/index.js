import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import * as Sentry from '@sentry/electron';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.css';

Sentry.init({
  dsn: 'https://cf07bcc0594241ce8c7db854e0f3f65a@sentry.io/1297683'
});

const store = configureStore();

const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  document.getElementById('root')
);
