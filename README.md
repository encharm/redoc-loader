# redoc-loader
Webpack Redoc (OpenAPI) loader that's an alternative to redoc-cli

## Usage

You need to rely on Webpack 5 for your app build pipeline.

### Installation

```
npm install --development redoc-cli
```

or

```
yarn -D redoc-cli
```

### Configuring webpack
```ts
// add to resolve rules
{
  test: /\.openapi.yml$/, // name your OpenAPI definitions with *.openapi.yml
  use: [
    {
      loader: resolve(__dirname, 'webpack/openapi-loader.cts'),
      options: {
        overrides: {
          info: {
            title: `${serverProductInfo.name} API`,
            description: serverProductInfo.apiDescription,
            contact: {
              name: 'API support',
              email: serverProductInfo.email.support,
            }
          },
        }
      }
    }
  ],
},
```

### Importing in server-side code
```ts
  app.get('/apidocs', async (req, res) => {
    const { redocHTML, redocHead } = await import('./public.openapi.yml');

    res.render('apidocs', {
      redocHTML, redocHead,
    })
  });
```

Importing in client-side code should also be doable but wasn't tested.

## License

MIT (c) 2022 by Code Charm

Code based on redoc-cli also licensed under MIT