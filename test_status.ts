import { getStatusCodeCategory } from './src/utils/calculations';
console.log("c: ", getStatusCodeCategory("c"));
console.log("C - CLOSED: ", getStatusCodeCategory("C - CLOSED"));
console.log("C - OPEN: ", getStatusCodeCategory("C - OPEN"));
console.log("code c open: ", getStatusCodeCategory("code c open"));
console.log("code c closed: ", getStatusCodeCategory("code c closed"));
console.log("code \"c\" : ", getStatusCodeCategory("code \"c\""));
console.log("CLOSED: ", getStatusCodeCategory("CLOSED"));
console.log("c closed: ", getStatusCodeCategory("c closed"));
console.log("Code: C Open: ", getStatusCodeCategory("Code: C Open"));
console.log("Rejected: ", getStatusCodeCategory("Rejected"));




