#ChipNet Distributed Graph Search

## Overview

Route discovery finds one or more paths connecting nodes, via intermediate directional links, in a network.  Directly linked nodes share communication and can send messages in either direction between themselves, whereas transitive links must remain anonymous.

While searching a network generally presents many challenges, it is also a fairly well studied and practically well-trodden territory.  For instance, routing packets on the internet encounters most of the same challenges.  We've run mathematical estimates and simulations on various scenarios, and there are mitigating factors which prevent the worst case scenarios:
* **localized topology** - while in theory, discovery may go from any node, to any node in the network, in practice, the vast majority of transactions occur between members within a given community, or perhaps one level removed from a community.  A community can be geographical, topical, relational, or vocational, and each node will generally be connected across multiple such dimensions.  In simulation, "clusters" in pareto-like distributions, reduced the average query impact tremendously. 
* **super-connectors** - in the real world, degrees of freedom between entities is significantly reduced by the small number of entities who are connected to a disproportionately large number of others.  For instance, if you ever do business with Wal-mart, you are immediately 1 degree of fiscal separation from half a billion people.  In modelling, introducing even modest super-connectors into the network significantly improved discovery efficiency.
* **bi-directional searches** - the worst case unidirectional query in a flat, random scenario, requires "n/x" (x being average fan-out) nodes to be interrogated (assuming discovery is only needed to one-degree of separation).  Under bi-directional querying, the worst case query in a flat, random scenario is "Xth root of n" nodes.  While bi-directional searching may not always be possible for anonymity, there are techniques we employ that allow it even without disclosing the identities of the origin or target nodes.
* **routing only nodes** -  having to follow only open balances significantly reduces the search fan-out, but it is possible to search comm channels more generally, then open up a bi-directional return route.
* **advertising** - each level of indirection represents a combinatorial growth is searched nodes.  By preemptively giving real or transient identification to even 2 or 3 levels of transitive peers, search cost is significantly lowered.
* **portals** - parties wishing to remain anonymous, may disclose (not necessarily direct) peers who have public address in order to establish bi-directional searches.
* **caching** - while limited to disclosed logical addresses, and primarily to comms links, path caches can help to tremendously shorten search distance
  
Let's go deeper into the two general types of discovery:

* Unidirectional – Finds a target node, starting from an origin node
* Bidirectional – Finds a path from one node to another, working in both directions.  These endpoints may be the same node also.

### Unidirectional search

The unidirectional query algorithm proceeds as follows:
1. Starting at originator, queries the self participant.
2. On first search, a participant searches itself and all known peers for a target match.  
     * If match is found, it is returned, and local context is updated;
     * If no match, a set of potential candidates are collected and stored in local context;
3. Originator gets results.
     * If originator receives one or more match, returns them - done.
     * If no matches, reenter query on local participant
4. Participant resumes context by the session code and queries on all candidates.
5. Repeats until maximum depth is reached or match is found

Notes:
* Each node gives it's partners a finite time budget to execute.  If a response isn't received by the end of the step, a response will be given, excluding the result of the outstanding request.  During the next query, any outstanding responses from the prior step are folded in.
* The links of the path in the plan are built on the way out (to avoids cycles), the participant information is filled in on the way back (maximizes privacy).

### Bidirectional search

(Not supported yet)

The bidirectional algorithm proceeds similar to the unidirectional search, with the following differences:
* A synchronizing message is sent from the originator to the target (through the communications path) to initiate the search, and measure time delay
* With each phase of the query, the originator sends a follow-up synchronization message (including the time budget) to the target and delays for half of the round-trip time before executing the phase.  This attempts to have the two nodes initiate the search phase at nearly the same time.
* Following each phase, the originator interrogates the target for results and timing from the prior phase and the originator depth-level adjusts and integrates this into the timings for the next phase.  The target should have completed the phase by this interrogation, but should block to respond if not.
* For participants, in addition to searching for a match when a query arrives, looks to see if the same query has already arrived from a different path, with the opposing end.  
  * When this occurs, the participant pushes a probe message in the direction of the prior path (which accumulates participants), and responds with a match (which accumulates participants in the other direction)
  * As a result, one end gets a match, and the other should receive the probe as an incoming message
  * With both ends, they are spliced together relative to the originator to form a complete path

### Other scenarios

(Not supported yet)

* **Leader Probes** - In a uni-directional search, if a comms or lift intent path is found before the other, the target initiates a bidirectional search for the missing intent with its own synchronization.
* **Omnidirectional search** - In the event that the originator has multiple direct physical paths to various points in the network, an omnidirectional search can be initiated in the same manner as the bidirectional one, with each phase synchronized.  This address could be furnished through a directory of wellknown parties distributed in the network, or the target, as part of giving its address/identity, could provide the physical address of a public node of known connectivity.
* **Target Probes** - If the target knows that an originator is initiating a query, the target could, in the same phased breadth-first manner, send out advertising probes.  If the search hits a probed node, the node would respond with the probe path, then the originator would send out a probe along the returned route to build the complete path.
* **Advertisement** - Participants who wish to be found for payment, send out a breadth-first advertisement along desired links containing transient or permanent identity information, up to a certain depth (3-4 levels makes a significant difference in fan-out).  The information contains an expiration, and must be refreshed periodically.  When a search encounters such a node, the advertised path is returned and the originator probes to complete the path.

## Concepts

### Address

The target address is opaque to this protocol.  Note that various address scenarios are possible:
* *Indirect* – discovery by finding a node that "knows" of the node.  This is efficient, because search doesn't have to progress to the node itself.
* *Direct or Hidden* – search proceeds to the node itself.  This might be useful if the node itself needs to approve the request, or for maximum anonymity.
* *Anonymized indirect* – The target node provides to the originator the session ID and an anonymizing nonce, which allows a peer to recognize that target, but protects the fixed address.

### Participant

A participant is a node through which we are attempting to discover a path.  There are the following types of participants:
* **Originator** - The participant initiating the discovery
* **Intermediate** - A regular participant
* **Terminus** - The intended target of discovery

### Plan

A plan includes a set of members, participants, and the path of links connecting those participants.

### Link

A link is a directed edge (e.g. tally in MyCHIPs), between nodes.  Note that in general there may be multiple links that lead to and from the same participant node.  _Link_ refers to a trade/trust link or potentially only a communications link, as specified by one or more _intents_.

### Intent

An intent designates what purpose or purposes a given link is being selected to provide:

* **C (communications)** - All links should have this intent.  The terms provide details regarding the communications characteristics.  A comms intent implies that the communications element of a participant or referee part of a transaction can take place, or that the link can act as a relay.
* **L (lifts)** - able to provide a "lift" credit financial transaction.  See MyCHIPs for details.  The terms provide the details.

Intents must form complete chains along a given path.  In other words, if any participant in a given path does not include a Lift intent, then that path is collectively considered to not support lifts, and any lift intent in a link along that path should be ignored or deleted.

### Terms

Terms are specific key/values contained within intents, designating the details of that intent.  The semantics of terms within intents are directly handled by the discovery system, rather they are managed through callbacks.

### Session Code

Each query has a Session Code, which is a cryptographically random salt used to generate the hashed nonce, which acts as a surrogate identifier for participants in the session.  See [ChipCode](https://github.com/gotchoices/ChipCode) for details on CryptoHashes.  The Session Code essentially provides the following:
* A distributed unique identifier for the query
* A cryptographic salt for hashing private identifiers (allowing tally IDs to remain deterministic, but anonymous) - see Nonces
* A query lifetime (via expiration), allowing parties to safely release query-related resources afterward

### Nonce

A nonce, for the purpose of this library, is an anonymized (hashed and salted) link identifier.  Using a Nonce and the Session Code, a party can verify the identity of an already known identifier, but the Nonce and Session Codes don't otherwise disclose the identity.  The nonce is produced by getting the base64 encoding of the SHA-256 hash of the link prepended to the Session Code.  See the [ChipCode](https://github.com/gotchoices/ChipCode) library for details.

### Query

A node query (`QueryRequest`) is either first-time, or reentrant.  

![depth1 query](discovery/figures/depth1-query.png)
For first-time queries:
* **Verify Session Code** is unique - history kept in state within expiration window
* **Search made** locally based on the current nodes secret and public identities, as well as known peer identities
* **State stored** for the query (whether found or not), so further queries can be rejected or resumed
* **Candidates stored** to state if no matches are found for next depth if needed

![depth2 query](discovery/figures/depth2-query.png)
Reentrant queries are resumed by the session code in order to search another level deep:
* **Session Code expiration** validated 
* **Late-responding requests** inspected in case they already contain results
* **Sub-node candidates queried** 
* **State is updated** when all responses are in, or the time budget is up
* **Results are returned**

## Step Sequence Timing

Note: Partly implemented

Details can be found in [Time Sync via THIST](discovery/time-sync.md)
Timing is carefully orchestrated during the route discovery process. With each depth level represents a query sequence.  The querying participant waits for responses based on a combination of factors:
* **All responses** - If all responses are in, this overrides the time budget, and a response is immediately made
* **Time budget** - Each node is given a fixed budget by the requester, which includes the subtraction of the previously measured round-trip delay time.  When this elapses, regardless of number of respondents, the sequence is over and a responses is given
* If a **late response** arrives after a sequence completes, it will be included in the next sequence, if there is one.

## Query economics

**Note:** for discussion - mostly not implemented

The total cost of a query is determined by the aggregate number of nodes searched.  Every node is incentivized to keep costs to a minimum because high-cost queries will degrade future standing.
* The cumulative cost associated with sub-links is kept by each node, and aggregated back up the query.
* For nodes with high fan-outs, accumulated costs from prior queries are used to prioritize sub-links to reduce effective fan-out.
* Maximum fan-out is determined by cumulative cost of incoming query node
* For a node with trimmed fan-out, de-prioritized sub-links are treated like nodes at a deeper level.  For instance, if a node has 1,000 sub-links and a max fan-out of 100, the first level query (relative to the node) will only propagate to the 100 sub-links with the lowest cumulative costs.  When the node receives the next query for a level deeper, it queries the next level with the prior 100 sub-links, but may query first level with the rest of the nodes.
* A node can choose to penalize a disproportionately high cost sub-link, but skipping one or more propagations
* Sub-nodes also account for query costs against their up-stream (querying) nodes.  This disincentivizes up-stream nodes from performing any more queries than necessary.

This scheme avoids a pile-on effect for successful paths, favoring diversity of pathways, and disincentivizes over-searching.

TODO:
* Give "cumulative cost" a better name.  Score?  Effort?

## Pathologies

* Too deep - a node attempts to query above agreed upon thresholds
  * Incentives: allows the node to discover pathways despite extreme aggregate expense
  * Disincentives: accumulates cost
  * Mitigations:
    * [x] All nodes check for max depth.  Sub-links will fail one-level deeper
    * [ ] All nodes have a max-cost cut-off.
* Too wide - a node fans out extremely widely, resulting in large numbers of queried nodes for every received query.  This is actually okay from a self-search (first level) perspective, but undesirable in terms of propagation.
  * Incentives: results in more successes
  * Disincentives:
    * increases costs - slows future searching
    * 
* Unsatisfied originator - A root node receives one or more valid paths from one or more sub-links, but continues searching deeper on sub-links where a match wasn't found.
  * Incentives: this could give an Originator "more options" to choose from to complete the transaction.
  * Disincentives:
    * accumulates more cost against originator
    * additional paths would be deeper than already discovered ones
    * takes more time
  * Mitigations:
    * [x] Maximum depth will be eventually reached, and is checked by all nodes
* Statistics hiding - not disclosing the true accumulation of stats from sub-queries
  * Incentives: Reduces apparent costs
  * Mitigations:
    * [ ] Perhaps the cost associated with a successful result is based on an assumed cost per path depth, rather than reported statistics.
* Lazy nodes - don't search or propagate requests
  * Incentives: minimizes resource expenditures
  * Disincentives: does not accomplish transactions
* Liars - indicate false paths
  * Incentives: Be used as a pathway
  * Mitigations: Will not achieve transaction promise - waste of resources
* Denial of service - unnecessary queries
  * Disincentives: accumulates costs uselessly
* Not de-prioritizing based on cumulative costs
  * Disincentives: accumulates high costs against small pool of sub-nodes


Why participate?

Lift:
* Originator - make payment, clear balances [term?]
* Terminus (target) - get paid, clear balances
* Intermediate - clear balances, network intelligence [failures, successes, frequency - through partners]
* 3rd party Referee - subscription payment?  Goodwill?  Promotion?
* Comms relays - network intelligence - speeds up further transactions
