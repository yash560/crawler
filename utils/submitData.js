import axios from "axios";

export const postFinalData = async (finalObj) => {
  await axios.post(
    "https://webverse.thewebvale.com/api/data?collection=programs-new",
    finalObj,
    {
      headers: {
        Authorization:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjI4YTZiODYxZmE5MTJiNTYzODAxMDIiLCJjdXN0b21lciI6InByb2dyYW1pbnNpZGVyIiwiaWF0IjoxNzUzMTE1MDU5LCJleHAiOjE3ODQ2NzI2NTl9.yDFSi4AXq_K5PGBPdnXMob9Gu2ojZUy2csaXHFS4fVM",
      },
    }
  );
};
