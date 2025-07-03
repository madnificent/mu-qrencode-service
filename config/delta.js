export default function delta(req, res) {
  console.error("Received delta but no config to handle the delta is mounted.");
  req
    .status(500)
    .send(JSON.stringify({message: "No function mounted to handle delta"}));
}
