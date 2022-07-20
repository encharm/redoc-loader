import { dirname, join, parse, resolve } from 'path';
import { validate } from 'schema-utils';
import type { LoaderDefinitionFunction } from 'webpack';
import { createStore, loadAndBundleSpec, Redoc, RedocRawOptions } from 'redoc';
import { ServerStyleSheet } from 'styled-components';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { readFile } from 'fs/promises';
import { OpenAPISpec } from 'redoc/typings/types';
import { merge } from 'lodash';

interface Options {
  redocOptions?: RedocRawOptions;
  pathToSpec?: string ,
}

const BUNDLES_DIR = dirname(require.resolve('redoc'));

function sanitizeJSONString(str: string) {
  return escapeClosingScriptTag(escapeUnicode(str));
}

function escapeClosingScriptTag(str: string) {
  return str.replace(/<\/script>/g, '<\\/script>');
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
function escapeUnicode(str: string) {
  return str.replace(/\u2028|\u2029/g, m => '\\u202' + (m === '\u2028' ? '8' : '9'));
}

async function getPageHTML(
  spec: any,
  {
    redocOptions = {}, pathToSpec = undefined,
  }: Options,
) {
  // const specUrl = redocOptions.specUrl || pathToSpec;
  const store = await createStore(spec, pathToSpec, redocOptions);
  const sheet = new ServerStyleSheet();
  const html = renderToString(sheet.collectStyles(React.createElement(Redoc, { store })));
  const css = sheet.getStyleTags();
  const state = await store.toJS();

  const redocStandaloneSrc = await readFile(join(BUNDLES_DIR, 'redoc.standalone.js'), 'utf8');

  // const pugContents = await readFile(templateFileName, 'utf8');
  const ssr = true;
  return {
    redocHTML: `
    <div id="redoc">${(ssr && html) || ''}</div>
    <script>
    ${(ssr && `const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};`) || ''}
    var container = document.getElementById('redoc');
    Redoc.${
      ssr
        ? 'hydrate(__redoc_state, container)'
        : `init("spec.json", ${JSON.stringify(redocOptions)}, container)`
    };
    </script>`,
    redocHead: (`<script>${redocStandaloneSrc}</script>`) + css,
  };
}

interface LoaderOptions {
  overrides: Partial<OpenAPISpec>;
  redocOptions: any;
}

const loaderFunction: LoaderDefinitionFunction<LoaderOptions> = function(content) {
  const callback = this.async();

  const options = this.getOptions();

  console.log('Options', options);
  validate({
    type: 'object',
    properties: {
      overrides: {
        type: 'object',
      },
      redocOptions: {
        type: 'object',
      },
      pathToSpec: {
        type: 'string',
      }
    },
  }, options, {
    name: 'OpenAPI loader',
    baseDataPath: 'options',
  });

  loadAndBundleSpec(resolve(this.resourcePath)).then(async spec => {
    if (options.overrides) {
      spec = merge({}, spec, options.overrides);
    }
    const pageHTML = await getPageHTML(spec, { });

    callback(null, `module.exports = ${JSON.stringify(pageHTML)};`);
  });
}

export default loaderFunction;