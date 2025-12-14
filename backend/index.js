require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 3000;
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
// middleware
app.use(
  cors({
    // origin: [process.env.CLIENT_DOMAIN,],
    origin: [
      // "http://localhost:5173",
      process.env.CLIENT_DOMAIN,
    ],
    credentials: true,
    // optionsSuccessStatus: 200,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  console.log(token);
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    console.log(decoded);
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: "Unauthorized Access!", err });
  }
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // await client.connect();
    const db = client.db("plantsDB");
    const userCollection = db.collection("users");
    const plantsCollection = db.collection("plants");
    const orderCollection = db.collection("orders");
    const sellerRequestCollection = db.collection("sellerRequests");

    // verify admin
    const verifyADMIN = async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await userCollection.findOne({ email });
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ message: "Admin only Action!", role: user?.role });
      }
      next();
    };
    // verify seller
    const verifySELLER = async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await userCollection.findOne({ email });
      if (user?.role !== "seller") {
        return res
          .status(403)
          .send({ message: "Seller only Action!", role: user?.role });
      }
      next();
    };
    // save or update user data
    app.post("/user", async (req, res) => {
      const userData = req.body;
      userData.created_at = new Date().toISOString();
      userData.last_loggedIn = new Date().toISOString();
      userData.role = "customer";

      const query = {
        email: userData.email,
      };

      const alreadyExist = await userCollection.findOne(query);
      console.log("Already exist", !!alreadyExist);
      if (alreadyExist) {
        console.log("update user info");
        const result = await userCollection.updateOne(query, {
          $set: {
            last_loggedIn: new Date().toISOString(),
          },
        });
        return res.send(result);
      }
      console.log("saving user info.....");
      const result = await userCollection.insertOne(userData);
      res.send(result);
    });

    // get all user from admin
    app.get("/users", verifyJWT, verifyADMIN, async (req, res) => {
      const adminEmail = req.tokenEmail;
      const result = await userCollection
        .find({ email: { $ne: adminEmail } })
        .toArray();
      res.send(result);
    });
    // Save plant db
    app.post("/plants", verifyJWT, verifySELLER, async (req, res) => {
      const plantData = req.body;
      const result = await plantsCollection.insertOne(plantData);
      res.send(result);
    });

    app.get("/plants", async (req, res) => {
      // const cursor = plantsCollection.find();
      // const result = await cursor.toArray();
      // short version
      const result = await plantsCollection.find().toArray();
      res.send(result);
    });
    app.get("/plants/:id", async (req, res) => {
      const id = req.params.id;
      const result = await plantsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Payment status
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      console.log(paymentInfo);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: paymentInfo?.name,
                description: paymentInfo?.description,
                images: [paymentInfo?.image],
              },
              unit_amount: paymentInfo?.price * 100,
            },
            quantity: paymentInfo?.quantity,
          },
        ],
        customer_email: paymentInfo?.customer?.email,
        mode: "payment",
        metadata: {
          plantId: paymentInfo?.plantId,
          customer: paymentInfo?.customer.email,
        },
        success_url: `${process.env.CLIENT_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_DOMAIN}/plant/${paymentInfo?.plantId}`,
      });
      res.send({ url: session.url });
    });

    app.post("/payment-success", async (req, res) => {
      const { sessionId } = req.body;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const plant = await plantsCollection.findOne({
        _id: new ObjectId(session.metadata.plantId),
      });
      const order = await orderCollection.findOne({
        transactionId: session.payment_intent,
      });

      if (session.status === "complete" && plant && !order) {
        const orderInfo = {
          plantId: session.metadata.plantId,
          transactionId: session.payment_intent,
          customer: session.metadata.customer,
          status: "pending",
          seller: plant.seller,
          name: plant.name,
          category: plant.category,
          quantity: 1,
          price: session.amount_total / 100,
          image: plant?.image,
        };
        const result = await orderCollection.insertOne(orderInfo);
        // update quantity
        await plantsCollection.updateOne(
          {
            _id: new ObjectId(session.metadata.plantId),
          },
          { $inc: { quantity: -1 } }
        );
        return res.send({
          transactionId: session.payment_intent,
          orderId: result.insertedId,
        });
      }
      res.send(
        res.send({
          transactionId: session.payment_intent,
          orderId: order._id,
        })
      );
    });

    // my order by email
    app.get("/my-orders", verifyJWT, async (req, res) => {
      const result = await orderCollection
        .find({ customer: req.tokenEmail })
        .toArray();
      res.send(result);
    });

    // seller order
    app.get(
      "/manage-orders/:email",
      verifyJWT,
      verifySELLER,
      async (req, res) => {
        const email = req.params.email;
        const result = await orderCollection
          .find({ "seller.email": email })
          .toArray();
        res.send(result);
      }
    );

    // get all plant for seller by email
    app.get(
      "/my-inventory/:email",
      verifyJWT,
      verifySELLER,
      async (req, res) => {
        const email = req.params.email;
        const result = await plantsCollection
          .find({ "seller.email": email })
          .toArray();
        res.send(result);
      }
    );

    // const email = req.tokenEmail;
    // save seller request
    app.post("/become-seller", verifyJWT, async (req, res) => {
      const { name, email, image } = req.body;
      const sellerRequest = {
        // userId: req.user?.userId || req.user?._id,
        name,
        email,
        image: image,
      };
      const alreadyExist = await sellerRequestCollection.findOne(sellerRequest);
      if (alreadyExist)
        return res
          .status(409)
          .send({ message: "already you requested, please wait" });
      const result = await sellerRequestCollection.insertOne(sellerRequest);
      res.send(result);
    });
    // ger all seller request for admin
    app.get("/seller-request", verifyJWT, verifyADMIN, async (req, res) => {
      const result = await sellerRequestCollection.find().toArray();
      res.send(result);
    });

    // update user role
    // app.patch("/update-role", verifyJWT, async (req, res) => {
    //   const { id, email, role } = req.body;

    //   const existingRequest = await sellerRequestCollection.findOne({
    //     _id: new ObjectId(id),
    //   });

    //   if (!existingRequest) {
    //     return res.status(404).send({ message: "Seller request not found" });
    //   }
    //   console.log("📋 Found existing request:", existingRequest);
    //   // update userCollection
    //   const result = await userCollection.updateOne(
    //     { email: existingRequest.email },
    //     { $set: { role } }
    //   );

    //   // delete seller request from sellerCollection
    //   const deleteRequest = await sellerRequestCollection.deleteOne({
    //     _id: new ObjectId(id),
    //   });

    //   res.send(result);
    // });
    app.patch("/update-role", verifyJWT, verifyADMIN, async (req, res) => {
      const { id, email, role } = req.body;
      try {
        // CASE 1: Seller request approval
        if (id) {
          const existingRequest = await sellerRequestCollection.findOne({
            _id: new ObjectId(id),
          });

          if (!existingRequest) {
            return res
              .status(404)
              .send({ message: "Seller request not found" });
          }

          // update user role
          await userCollection.updateOne(
            { email: existingRequest.email },
            { $set: { role } }
          );

          // delete seller request
          await sellerRequestCollection.deleteOne({
            _id: new ObjectId(id),
          });

          return res.send({
            message: "Seller request approved & role updated",
          });
        }

        // CASE 2: Admin updating any user role
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const result = await userCollection.updateOne(
          { email },
          { $set: { role } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "User not found or role unchanged" });
        }

        res.send({ message: "User role updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // get user role
    app.get("/user/role", verifyJWT, async (req, res) => {
      const result = await userCollection.findOne({ email: req.tokenEmail });
      res.send({ role: result?.role });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Server22222..");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
