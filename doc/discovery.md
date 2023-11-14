## Targets

The target address is opaque to this protocol.  Note that various address scenarios are possible:
* *Indirect* – discovery by finding a node that "knows" of the node.  This is effecient, because search doesn't have to progress to the node itself.
* *Direct or Hidden* - search proceeds to the node itself.  This might be useful if the node itself needs to approve the request, or if the identifier is a nonce rather than an address that is known by peers

## Addresses

An address identifies an edge (e.g. tally in MyCHIPs), not a node.  Note that there may be multiple addresses that lead to the same node.

## Nonces & QueryIds

A nonce, for the purpose of this library, is an anonymized (hashed and salted) address identifier.  Each query has a QueryId, which is a cryptographically random salt used to generate the hashed nonce, which acts as a surrogate public identifier.  The nonce is produced by getting the base64 encoding of the SHA-256 hash of the address prepended to the QueryId.

## hiddenData

Encrypted binary block containing:
* Depth (will be 1 after first query)
* Candidate addresses
* QueryID - ensure that it matches
* Current time - don't run stale queries

The encryptions is based on...