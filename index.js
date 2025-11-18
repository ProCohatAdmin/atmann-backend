require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");

// Change import syntax to require
const Razorpay = require("razorpay");

const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL, // ✅ Your Supabase project URL
  process.env.SUPABASE_SERVICE_ROLE_KEY, // ✅ Must use SERVICE_ROLE_KEY, not anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
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

// New endpoint to get pre-signed URL for secure file upload
app.post("/get-upload-url", async (req, res) => {
  try {
    const { fileName, user_id } = req.body;

    if (!fileName || !user_id) {
      return res.status(400).json({
        error: "fileName and user_id required",
      });
    }

    // Fix spaces in file name
    const safeName = fileName.replace(/\s+/g, "_");

    // Final path inside bucket
    const filePath = `reports/${user_id}/${safeName}`;

    // Generate pre-signed URL for uploading
    const { data, error } = await supabase.storage
      .from("blueprintReport")
      .createSignedUploadUrl(filePath, {
        expiresIn: 3600, // 1 hour
      });

    if (error) {
      console.error("❌ Supabase Signed URL Error:", error);
      return res.status(500).json({
        error: "Failed to generate upload URL",
        details: error.message,
      });
    }

    console.log("✅ Pre-signed upload URL generated:", filePath);

    res.json({
      uploadUrl: data.signedUrl,
      filePath, // needed for saving later
    });
  } catch (err) {
    console.error("❌ Server Error in get-upload-url:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/save-report-url", async (req, res) => {
  try {
    const { user_id, filePath } = req.body;

    if (!user_id || !filePath) {
      return res.status(400).json({ error: "Missing user_id or filePath" });
    }

    // FINAL PUBLIC URL (never expires)
    const publicURL = `${process.env.SUPABASE_URL}/storage/v1/object/public/blueprintReport/${filePath}`;

    // Save inside user table
    const { error } = await supabase
      .from("user")
      .update({ blueprint_pdf_url: publicURL })
      .eq("user_id", user_id);

    if (error) {
      console.error("❌ Error saving report URL:", error);
      return res.status(500).json({ error: "Failed to save report URL" });
    }

    console.log("✅ PDF report URL saved:", publicURL);

    res.json({
      success: true,
      reportURL: publicURL,
    });
  } catch (err) {
    console.error("❌ Server Error in save-report-url:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/get-report-url", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id" });
    }

    // Fetch blueprint PDF URL from user table
    const { data, error } = await supabase
      .from("user") // your actual table name
      .select("blueprint_pdf_url")
      .eq("user_id", user_id)
      .single();

    if (error) {
      console.error("❌ Error fetching report URL:", error);
      return res.status(500).json({ error: "Failed to fetch report URL" });
    }

    if (!data || !data.blueprint_pdf_url) {
      return res.status(404).json({ error: "Report not found for this user" });
    }

    // Return the public permanent URL
    return res.json({
      success: true,
      reportURL: data.blueprint_pdf_url,
    });
  } catch (err) {
    console.error("❌ Server Error in get-report-url:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});




app.get("/", (req, res) => {
  res.send("atman");
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
