## Addresses

The target address is opaque to this protocol.  Note that various address scenarios are possible:
* *Indirect* – discovery by finding a node that "knows" of the node.  This is effecient, because search doesn't have to progress to the node itself.
* *Direct or Hidden* - search proceeds to the node itself.  This might be useful if the node itself needs to approve the request, or for maximum anonymity.

## Links

A link identifies an edge (e.g. tally in MyCHIPs), not a node.  Note that there may be multiple links that lead to the same node.  This is unrelated to a communications link.

## Nonces & QueryIds

A nonce, for the purpose of this library, is an anonymized (hashed and salted) link identifier.  Each query has a QueryId, which is a cryptographically random salt used to generate the hashed nonce, which acts as a surrogate public identifier.  The nonce is produced by getting the base64 encoding of the SHA-256 hash of the link prepended to the QueryId.

## Reentrance tickets

Encrypted binary block containing state data necessary to continue search at depth > 1:
* Depth (will be 1 after first query)
* Candidate links
* QueryID - ensure that it matches
* Current time - don't run stale queries

The encryption is based on an aes-256 key which is given as part of configuration options.