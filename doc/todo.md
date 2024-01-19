* Get type checking working in jest tests
* Use ChipCrypt for all places that use crypto.  Make getBytes something tests can mock.
* Allow participants to suggest relay nodes - perhaps unify plan and ChipSync's topology better
* Originator should match immediate peers (reuse with participant) and negotiate terms
* Key and resource lifetime hooks (hold at promise, release at majority vote received)
* Persist and rehydrate unfinished requests on participant like is done on originator
* License
* Maintain SessionCode history to validate SessionCode uniqueness
* Quotas & metrics
* Balance advertising
* Consider allowing for publicly identifiable links (don't nonce encode)
* Support local state as well as current reentrance ticket
