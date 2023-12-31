const Page = require('./helpers/page');

let page;

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
});

afterEach(async () => {
  await page.close();
});

describe('When logged in', async () => {
  beforeEach(async () => {
    await page.login();
    await page.click('a.btn-floating');
  });

  test('Can see login create form', async () => {
    const label = await page.getContentsOf('form label');

    expect(label).toEqual('Blog Title');
  });

  describe('And when using valid inputs', async () => {
    beforeEach(async () => {
      await page.type('.title input', 'Some title');
      await page.type('.content input', 'My content');
      await page.click('form button');
    });

    test('Submitting takes user to review screen', async () => {
      const text = await page.getContentsOf('h5');
      expect(text).toEqual('Please confirm your entries');
    });

    test('Submitting then saving adds blog to index page', async () => {
      await page.click('button.green');
      await page.waitFor('.card');

      const title = await page.getContentsOf('.card-title');
      const content = await page.getContentsOf('p');
      expect(title).toEqual('Some title');
      expect(content).toEqual('My content');
    });
  });

  describe('Using invalid inputs', async () => {
    beforeEach(async () => {
      await page.click('form button');
    });

    test('the form shows an error message', async () => {
      const titleError = await page.getContentsOf('.title .red-text');

      const contentError = await page.getContentsOf('.content .red-text');

      expect(titleError).toEqual('You must provide a value');
      expect(contentError).toEqual('You must provide a value');
    });
  });
});

describe('When not logged in', async () => {
  const actions = [
    {
      method: 'post',
      path:
        process.env.NODE_ENV === 'dev'
          ? 'http://localhost:9000/api/blogs'
          : '/api/blogs',
      data: { title: 'T', content: 'C' },
    },

    {
      method: 'get',
      path:
        process.env.NODE_ENV === 'dev'
          ? 'http://localhost:9000/api/blogs'
          : '/api/blogs',
    },
  ];

  test('Blog related actions are prohibited', async () => {
    const results = await page.execRequest(actions);
    for (const result of results) {
      expect(result).toEqual({ error: 'You must log in!' });
    }
  });
});
