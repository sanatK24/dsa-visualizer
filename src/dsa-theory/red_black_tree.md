# Red-Black Tree Overview

A Red-Black Tree (RBT) is a self-balancing binary search tree with the following properties:

- Each node is either red or black.
- The root is black.
- All leaves (NIL) are black.
- If a node is red, then both its children are black.
- Every path from a node to its descendant NIL nodes contains the same number of black nodes.

Common operations: insertion, deletion, search. Insertions and deletions may require recoloring and rotations to restore RBT properties.

Code snippets and examples for insertion steps are available in the project `src/core/RBTree.ts`.
