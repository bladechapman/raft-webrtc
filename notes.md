## 8 Client Interaction

- "Clients of Raft send all of their requests to the leader."
- "If the client’s first choice is not the leader, that server will reject the client’s request and supply information about the most recent leader it has heard from" 

- A client’s request will look like an AppendEntries on the leader

Client asks         Node forwards append    --> Leader handles append, responds
to append "A" -->   to leader

              <--                           <--
