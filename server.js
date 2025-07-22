import express from "express";
import freidaRouter from "./routes/freida.js";
import programsRouter from "./routes/programs.js";
import workflowRouter from "./routes/workflow.js";
import distributeRouter from "./routes/distribute.js";

const app = express();
app.use(express.json());

// Mount routers
app.use("/crawl", freidaRouter);
app.use("/programs", programsRouter); 
app.use("/workflow", workflowRouter); 
app.use("/distribute", distributeRouter); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
