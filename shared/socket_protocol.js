(typeof exports === 'undefined' ? window : exports).Protocol = {
  //Packet types:
  DEFAULT_PACKET: 1,
  CONTROL_PACKET: 2,

  /* Control packet operations */
  CLIENT_ID: 1,  // Sent from the server, data will be the id the client should take,  
  WIPE: 2        // Sent from the server, will clear the local slate
}