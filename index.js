const express = require('express')
const app = express()
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://b022210082:password1234@cluster0.uhzytme.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.use(express.json())

app.patch('/profile', (req, res) => {
  console.log(req.body)
  client.db("BENR2423").collection("users").updateOne({
    "username": req.body.username
  }, {
    $set: {"email": req.body.email}
  }).then((result) => {
    res.send('update succesfully')
  })})

app.post('/register', (req, res) => {
  client.db("BENR2423").collection("users").find({
    "username": { $eq: req.body.username}
  }). toArray().then((result) => {
    console.log(result)
    if (result.length > 0) {
      res.status(400).send('Username already exists')
    } else {
  client.db("BENR2423").collection("users").insertOne({
    "username": req.body.username,
    "password": req.body.password
  })
  res.send('register succesfully')
    }
})
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

/*app.post('/login', (req, res) => {

  console.log(req.body.username, req.body.password)
  // Check if username is valid
  if (req.body.username != 'syeeraeiya') {
    return res.status(400).send('Invalid User')
  }

  //TODO: Check if password is correct
  if (req.body.password != '1234') {
    return res.status(400).send('Invalid Password')
  }
  res.send('login succesfully')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})*/