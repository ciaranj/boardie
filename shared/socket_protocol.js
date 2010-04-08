(typeof exports === 'undefined' ? window : exports).Protocol = {
  /* Connection state events */
  OPENED: 1,
  CLOSED: 2, 
  
  /* Control packet operations */
  CLIENT_ID: 3,  // Sent from the server, data will be the id the client should take,  
  WIPE: 4,        // Sent from the server, will clear the local slate,
  REFRESH: 5,     // Client requested a full refresh.
  
  /* Operation packet operations */
  NEW_PRIMITIVE: 100
}