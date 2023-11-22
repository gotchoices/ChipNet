## Overview

Route discovery finds a route between nodes, which are connected by directional links, in a network.  Linked nodes know ether other's communications address and can send messages in either direction between themselves.

There are two general types of discovery:

* Unidirectional – Finds a target node, starting from an origin node
* Bidirectional – Finds a path from one node to another, starting from both nodes.  These nodes may be the same node also.

## Addresses

The target address is opaque to this protocol.  Note that various address scenarios are possible:
* *Indirect* – discovery by finding a node that "knows" of the node.  This is effecient, because search doesn't have to progress to the node itself.
* *Direct or Hidden* – search proceeds to the node itself.  This might be useful if the node itself needs to approve the request, or for maximum anonymity.
* *Anonymized indirect* – The target node provides to the originator initializes the transaction ID uses it to generate an anonymizing hash if it indirect address (as known to its peer).  This allo

## Links

A link identifies a directed edge (e.g. tally in MyCHIPs), between nodes.  Note that there may be multiple links that lead to and from the same node.  This is unrelated to a communications link.

## Anode

An anode in this protocol is a description of node in terms of the pair of intersecting links.  For instance, if links L1 and L2 both connect to node N1, node N1's anode can be visualized as "L1-L2".  An anode for describing a node at the end of a chain might look like "L5-".  "-L1" for describing the beginning.  Note that the scheme used here, using the dash, is not part of the definition.  All that is important is that it comprises an ordered pair of link (or nonce) identifiers.

## Nonces & Transaction IDs

A nonce, for the purpose of this library, is an anonymized (hashed and salted) link identifier.  Each query has a Transaction ID, which is a cryptographically random salt used to generate the hashed nonce, which acts as a surrogate identifier for participants in the transaction.  The nonce is produced by getting the base64 encoding of the SHA-256 hash of the link prepended to the Transaction ID.

## Reentrance tickets

Encrypted binary block containing state data necessary to continue search at depth > 1:
* Depth (will be 1 after first query)
* Candidate links
* TransactionID - ensure that it matches
* Current time - don't run stale queries

The encryption is based on an aes-256 key which is given as part of configuration options.