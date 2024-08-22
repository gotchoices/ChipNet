* Process the update for each occurrence of self in members (right now it assumes it only occurs once)
* Simulation
  * Originator of transaction simulates sequence of reachability, with error margins of timing - A phase for promise, B phase for commit
  * Failure modes simulated
  * Translation to state-based member-level instructions?
Translates to set of state-based instructions for each node
* Stalled transaction handling (reach out periodically)
* Key and resource lifetime hooks (hold at promise, release at majority vote received)
* Logical clock concept described in ChipNet for complete timing related coverage
* Get type checking working in jest tests
* Key and resource lifetime hooks (hold at promise, release at majority vote received)
* License
* Have originator verify that target's signature matches target's PK as given by its address
* Verify PK matches SK for specific path during promise
* Identity verification "whispering" (hash of identity information shared with peer of peer using PK)
* Ability to generate a report indicating a break-down of the transaction record's validation.  Use a rule system.
