require('dotenv').config()
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtk1w.mongodb.net/?appName=Cluster0`;

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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });

        const categoriesCollection = client.db('libraryDB').collection('categories')
        const categoryWiseBooksCollection = client.db('libraryDB').collection('category_wise_books')


        app.get('/categories', async (req, res) => {
            const cursor = categoriesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/categoryWiseBooks/:category', async (req, res) => {
            const category = req.params.category
            const query = { category }
            const result = await categoryWiseBooksCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/books/:id', async (req, res) => {
            const id = req.params.id
            // console.log(typeof (parseInt(id)))
            const query = { bookId: parseInt(id) }
            const result = await categoryWiseBooksCollection.findOne(query)
            res.send(result)
        })
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run()



app.get('/', (req, res) => {
    res.send('Hello world')
})

app.listen(port, () => {
    console.log(`Library is waiting at :${port}`)
})