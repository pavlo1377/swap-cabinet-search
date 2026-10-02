require('dotenv').config();

const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');

const queryLimiter = sharetribeIntegrationSdk.util.createRateLimiter(
  sharetribeIntegrationSdk.util.devQueryLimiterConfig
);

const commandLimiter = sharetribeIntegrationSdk.util.createRateLimiter(
  sharetribeIntegrationSdk.util.devCommandLimiterConfig
);

const integrationSdk = sharetribeIntegrationSdk.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET,
  queryLimiter,
  commandLimiter,
  baseUrl:
    process.env.SHARETRIBE_INTEGRATION_BASE_URL ||
    'https://flex-integ-api.sharetribe.com',
});

const ordered = process.argv[2];

const userId = '6abdfe4d-9e8e-4df9-bce5-569c35144433';

const brands = [
  ['Nike', 'nike'],
  ['Adidas', 'adidas'],
  ['Puma', 'puma'],
  ['Reebok', 'reebok'],
  ['New Balance', 'new-balance'],
  ['Under Armour', 'under-armour'],
  ['Asics', 'asics'],
  ['Converse', 'converse'],
  ['Vans', 'vans'],
  ['Jordan', 'jordan'],
  ['Levi’s', 'levis'],
  ['Zara', 'zara'],
  ['H&M', 'hm'],
  ['Uniqlo', 'uniqlo'],
  ['Mango', 'mango'],
  ['Pull&Bear', 'pull-bear'],
  ['Bershka', 'bershka'],
  ['Stradivarius', 'stradivarius'],
  ['Massimo Dutti', 'massimo-dutti'],
  ['COS', 'cos'],
  ['Arket', 'arket'],
  ['Gucci', 'gucci'],
  ['Prada', 'prada'],
  ['Versace', 'versace'],
  ['Balenciaga', 'balenciaga'],
  ['Burberry', 'burberry'],
  ['Michael Kors', 'michael-kors'],
  ['Calvin Klein', 'calvin-klein'],
  ['Tommy Hilfiger', 'tommy-hilfiger'],
  ['Ralph Lauren', 'ralph-lauren'],
];

const listings = brands.map(([brandName, brandValue], index) => ({
  title: `${brandName} Shoes`,
  description: `${brandName} second-hand shoes in good condition.`,
  authorId: userId,
  state: 'published',
  price: {
    amount: 5000 + (index % 10) * 500,
    currency: 'EUR',
  },
  publicData: {
    brand: brandValue,
  },
  metadata: {
    extId: `brand-demo-${index + 1}`,
  },
}));

const timeout = 600;

const getNewWait = currentWait =>
  currentWait * 2 + Math.floor(Math.random() * 100);

let wait;

const createWithTimeouts = (fns, resolve, reject, results = []) => {
  const [firstFn, ...restFns] = fns;
  wait = timeout;

  console.log('Remaining items:', fns.length);

  if (firstFn) {
    firstFn()
      .then(res => {
        setTimeout(() => {
          createWithTimeouts(restFns, resolve, reject, [...results, res]);
        }, timeout);
      })
      .catch(res => {
        if (res.status === 429) {
          wait = getNewWait(wait);
          console.log(`Rate limit exceeded, waiting for ${wait} ms...`);

          setTimeout(() => {
            createWithTimeouts(fns, resolve, reject, results);
          }, wait);
        } else {
          reject([...results, res]);
        }
      });
  } else {
    resolve(results);
  }
};

const createListingsWithTimeouts = () =>
  new Promise((resolve, reject) => {
    const fns = listings.map(listing => () =>
      integrationSdk.listings.create(listing, { expand: true })
    );

    createWithTimeouts(fns, resolve, reject);
  });

const createWithRetry = listing => {
  wait = 1000 * 60;

  integrationSdk.listings
    .create(listing, { expand: true })
    .then(resp => console.log('Successfully created:', resp))
    .catch(e => {
      if (e.status === 429) {
        console.log('Waiting due to too many requests...');
        setTimeout(() => createWithRetry(listing), wait);
      } else {
        console.log('Error when creating listing:', e);
      }
    });
};

if (ordered === '--ordered=false') {
  for (const listing of listings) {
    createWithRetry(listing);
  }
} else {
  createListingsWithTimeouts()
    .then(res => console.log(`Successfully created ${res.length} listings.`))
    .catch(e => console.log('Error occurred:', e));
}