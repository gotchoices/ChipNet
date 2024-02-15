## Overview

Route discovery finds a route between nodes, which are connected by directional links, in a network.  Linked nodes know ether other's communications address and can send messages in either direction between themselves.

There are two general types of discovery:

* Unidirectional – Finds a target node, starting from an origin node
* Bidirectional – Finds a path from one node to another, starting from both nodes.  These nodes may be the same node also.

## Addresses

The target address is opaque to this protocol.  Note that various address scenarios are possible:
* *Indirect* – discovery by finding a node that "knows" of the node.  This is effecient, because search doesn't have to progress to the node itself.
* *Direct or Hidden* – search proceeds to the node itself.  This might be useful if the node itself needs to approve the request, or for maximum anonymity.
* *Anonymized indirect* – The target node provides to the originator initializes the session ID uses it to generate an anonymizing hash if it indirect address (as known to its peer).  This allo

## Links

A link identifies a directed edge (e.g. tally in MyCHIPs), between nodes.  Note that there may be multiple links that lead to and from the same node.  This refers to a trade/trust link, not specifically a communications link, though it does imply that a communications link may be established.

## Session Code

Each query has a Session Code, which is a cryptographically random salt used to generate the hashed nonce, which acts as a surrogate identifier for participants in the session.  See ChipCode for details on CryptoHash.  The Session Code essentially provides the following:
* A distributed unique identifier for the query
* A cryptographic salt for hashing private identifiers (allowing tally IDs to remain deterministic, but anonymous) - see Nonces
* A query lifetime (via expiration), allowing parties to safely release query-related resources afterward

## Nonces

A nonce, for the purpose of this library, is an anonymized (hashed and salted) link identifier.  Using a Nonce and the Session Code, a party can verify the identity of a known identifier, but the Nonce and Session Codes don't otherwise disclose the identity.  The nonce is produced by getting the base64 encoding of the SHA-256 hash of the link prepended to the Session Code.  See the ChipCode library for details.

## Query

A node query (`QueryRequest`) is either first-time, or reentant.  

For first-time queries:
* They are verified to be unique (history kept in state within expiration window) 
* Searched locally based on the current nodes secret and public identities, as well as known peer identities.
* The state of the query (whether found or not) is stored in state, so further queries can be rejected or resumed
* If no matches are found, candidates are stored as part of state

Reentrant queries include a structure necessary to resume (search another level deep):
* SessionCode - used to retrieve the query context from state storage
* Expiration time - don't run stale queries
Each node persists the state of the query by the SessionCode.

## Sequences

Timing is carefully orchestrated during the route discovery process. With each depth level (sequence), the originator waits for responses based on a combination of factors:
* Prior request timing - It is assumed that the amount of time taken by the prior request to complete will likely function as a baseline for the next request
* Minimum time for critical threshold - The earliest the sequence can terminate is when a critical proportion of responses come in, and at least a minimum amount of time (above the baseline) has transpired
* All responses - If all responses are in, this override the minimum time and critical threshold
* Maximum time - Regardless of number of respondants, if the maximum time (above baseline) has transpired, the sequence is over

If a response arrives after a sequence completes, it will be included in the next sequence, if there is one.
