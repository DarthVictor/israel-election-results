# Israel Election Results Explorer

This context describes the terms used to explore official Israeli election results by locality. It keeps historical election data distinct while allowing a viewer to inspect or compare them.

## Language

**Election**:
A single Knesset election dataset, identified by its election number and containing that election's party lists and locality results.
_Avoid_: Dataset, year

**Party List**:
An electoral list as it appeared in one Election. A Party List is scoped to that Election; similarly named lists in different elections are not automatically the same entity.
_Avoid_: Party, candidate list

**Analysis Selection**:
The complete viewer choice: active analysis mode, Election, optional Party List, optional locality, filters, and (for comparison) the independent B selection.
_Avoid_: App state, query parameters

**Explore Analysis**:
An Analysis Selection for inspecting one Election. It may have no Party List selected, in which case locality-wide results remain meaningful but party-share mapping does not.
_Avoid_: Default analysis, single-party analysis

**Comparison Analysis**:
An Analysis Selection with independent A and B Election and Party List choices. It compares recorded list results and does not assert that two historical lists are the same political entity.
_Avoid_: Party history, party migration

**Locality Result**:
The official result record for one locality in one Election, including ballots, valid votes, turnout, and votes by Party List.
_Avoid_: Settlement result, city result

**Mappable Locality**:
A Locality Result that has a matched boundary geometry and can therefore be displayed and selected on the map.
_Avoid_: Map row, geographic result
