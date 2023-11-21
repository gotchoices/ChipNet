# Ring vote consesus

The goal of this algorithm is to have all nodes eventually converge, and to perform well in the normal case.  The proposed algorithm should takes as much time as a single message would take to traverse ONE WAY down the chain in the best case.  If a node possesses a record committed by a majority of nodes, it can treat the transaction as fully committed.  If a node possesses a record voided by a majority of nodes, it can safely free resources.

The worst case scenario is that a majority of nodes in the ring completely go offline indefinitely, in which case, the minority are stuck with locked resources.  Note that this requires *all* of said majority nodes to not be reachable through *any* potential path from any of the online set, in perpetuity; which essentially means they are forever lost from the network.

## Phases

1. Discover – Find at least one route between originator and terminus matching the financial terms, and at least one non-financial route which doesn't intersect the first.  The latter route may also be direct in the event that the terminus discloses its physical address.

2. Promise – An all or nothing commitment of resources by each node.


3. Commit - Dissemination of promises back to all nodes whereby majority wins.

	
## Discovery Phase

* Proceeds as documented in linear or bidirectional discovery.

* Node schema is spelled out explicitly.  All subsequent signatures include a hash of the schema and terms

* Verify reasonable time sync during discovery communication.  Measure delay time in both directions.
    
    * If out of sync, begin async update of own clock via 3rd party of self-choosing e.g. NIST

## Promise Phase

<p align="center"><img src="figures/promise-start.png" width="500" title="Sites contain multiple users"></p>

* Originator adds promise and sends in both directions

    * Each node also adds own promise and forwards

* If a node gets promises from both directions, will have all promise votes.  Promise phase complete (convergence node)

<p align="center"><img src="figures/promise-end.png" width="500" title="Sites contain multiple users"></p>

* If node receives incomplete promises, and timeout before sign, don't promise, add "pre-promise void" (PPV) signature instead and send in both directions. 

## Commit Phase

<p align="center"><img src="figures/commit-start.png" width="500" title="Sites contain multiple users"></p>

* Convergence node adds commit signature and sends fully promised record in both directions

<p align="center"><img src="figures/commit-next.png" width="500" title="Sites contain multiple users"></p>

* If meets from other direction, done.

<p align="center"><img src="figures/commit-committed.png" width="500" title="Sites contain multiple users"></p>

* If have self-committed and timeout, add void signature and send in both directions

* If can't send either void or commit to a peer:

    * If opposing peer doesn't have your commit or void, send it to them

    * If node on other end of unresponsive peer not in your record, attempt to discover communications route to them

        * If reached, send record

        * Can't reach or another timeout, try next node in ring (if not in record) and repeat

## Node-level protocol
	
* If receive record from a peer, decide if it has new information and pass it on appropriately

    * If a record has a majority of votes for a PPV, commit or void, majority wins, support it

    * Otherwise, if after timeout add PPV/void, commit if before

* If you're a node which has been out of communication, and you come back online, if you have signed anything that would now be timed out, reach out to both peers for an update.

* If a broken, minority ring segment hits a timeout with no progress from ends trying to establish a route around, the second to end nodes should begin trying to route around, etc.

* Timeouts should all be synchronized, but use time doubling or some such to avoid thrashing

* Verify every peer message, including time sync, correct signatures, void before timeout, etc.  If incorrect, don't accept update; reply with problem, flag for reputation, and notify opposite peer

