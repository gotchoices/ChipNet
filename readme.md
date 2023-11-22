## Welcome to ChipNet

### Purpose

ChipNet is a meta-protocol implementation for performing path discovery, and transactions within a network of nodes in which only peer connections are trusted.  This library was built to affect "lifts" in [MyChips](https://github.com/gotchoices/MyCHIPs), but may be suitable for other peer-to-peer systems.  

This is described as a meta-protocol because this library does not handle communications, state persistence, and other characterics, but rather these are furnished by the library user.

This library provides the following capabilities:

* [Route discovery](doc/discovery.md) - performing a search for a given node identifier, either known to that node's peers, or only it itself
    * Unidirectional - search starting from a single node
    * Bidirectional - search starting from two nodes, or multiple edges of single node
* [Transactions](doc/transaction.md) - distributed transactions using ring voting consensus
    * Linear transaction - from one node to another
    * Circular transaction - starting from and ending at a single node
