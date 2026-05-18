const path = require('path');
const db = require('/Users/jordymontalvo/Documents/harmony/serve/components/db.js').default;
const lib = require('/Users/jordymontalvo/Documents/harmony/serve/components/lib.js').default;
const dashboardApi = require('/Users/jordymontalvo/Documents/harmony/serve/pages/api/app/dashboard.js').default;

const req = {
  query: {
    session: 'vdr6gtitbz7acp3vbld5o6i0k0oussy'
  },
  headers: {
    origin: 'http://localhost:8080'
  }
};

const res = {
  setHeader: () => {},
  end: () => {},
  json: (data) => {
    console.log("API RESPONSE FOR BRYAN:");
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }
};

dashboardApi(req, res).catch(err => {
  console.error("API Error:", err);
  process.exit(1);
});
