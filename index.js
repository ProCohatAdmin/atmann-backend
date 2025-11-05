const express = require("express");
const nodemailer = require("nodemailer");

// Change import syntax to require
const Razorpay = require("razorpay");

const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: "rzp_live_R9p9N0v31Z5S5c",
  key_secret: "UReLfdBxmBmhaIuUdVt2oc5D",
});


const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: "pranavarmarkar36@gmail.com",
    pass: "kheh kzio unfg zhvz",
  },
});
app.post("/razorpay", async (req, res) => {
  const { totalAmount } = req.body;
  const payment_capture = 1;
  const amount = totalAmount;
  const currency = "INR";

  const options = {
    amount: amount * 100,
    currency,
  };

  try {
    const response = await razorpay.orders.create(options);
    console.log("response is: ", response);
    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    console.log("amount not read", error);
  }
});

app.post("/create-plan", async (req, res) => {
  const { amount, interval, interval_count, name, description } = req.body;

  const options = {
    period: interval, // 'daily', 'weekly', 'monthly', 'yearly'
    interval: interval_count, // Number of intervals between charges
    item: {
      name: name,
      amount: amount * 100, // Amount in paise
      currency: "INR",
      description: description,
    },
  };

  try {
    const plan = await razorpay.plans.create(options);
    res.json(plan);
    console.log("options from plans API", options);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).send("Error creating plan");
  }
});

app.post("/create-subscription", async (req, res) => {
  const { plan_id, customer_email, customer_contact } = req.body;

  const options = {
    plan_id: plan_id,
    customer_notify: 1,
    quantity: 1,
    total_count: 1, // Total billing cycles
    start_at: Math.floor(Date.now() / 1000) + 3600, // Start after 1 minute
  };

  try {
    const subscription = await razorpay.subscriptions.create(options);
    res.json(subscription);
    console.log("options from subscriptions API", options);
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).send("Error creating subscription");
  }
});
app.post("/create-subscription4", async (req, res) => {
  const { plan_id, customer_email, customer_contact } = req.body;

  const options = {
    plan_id: plan_id,
    customer_notify: 1,
    quantity: 1,
    total_count: 4, // Total billing cycles
    start_at: Math.floor(Date.now() / 1000) + 3600, // Start after 1 minute
  };

  try {
    const subscription = await razorpay.subscriptions.create(options);
    res.json(subscription);
    console.log("options from subscriptions API", options);
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).send("Error creating subscription");
  }
});

app.get("/", (req, res) => {
  res.send("atman");
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
