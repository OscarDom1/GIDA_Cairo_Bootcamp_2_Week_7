#[derive(Copy, Drop, Serde, PartialEq, starknet::Store)]
pub struct Candidate {
    pub id: u256,
    pub index: u256, // Candidates will be one-indexed
    pub fname: felt252,
    pub lname: felt252,
    pub no_of_votes: u256,
    pub qualified: bool,
}

#[derive(Copy, Drop, Serde, PartialEq, starknet::Store)]
pub struct CandidateInput {
    pub fname: felt252,
    pub lname: felt252,
}

#[starknet::interface]
pub trait IVotingTrait<TContractState> {
    fn nominate(ref self: TContractState, candidate_fname: felt252, candidate_lname: felt252);
    fn batch_nominate(ref self: TContractState, candidates_data: Array<CandidateInput>);
    fn start_election(ref self: TContractState);
    fn cast_vote(ref self: TContractState, candidate_id: u256);
    fn uncast_vote(ref self: TContractState, candidate_id: u256);
    fn get_all_candidates(self: @TContractState) -> Array<Candidate>;
    fn get_candidate(self: @TContractState, candidate_id: u256) -> (felt252, felt252);
    fn disqualify_candidate(ref self: TContractState, candidate_id: u256);
    fn suspend_election(ref self: TContractState);
    fn count_votes(self: @TContractState) -> (u256, u256, Candidate); // returns total no of votes, winning number of votes, winning candidate
    fn end_election(ref self: TContractState);
    // fn sum(ref self: TContractState, x: u64, y: u64) -> u128;
}

#[derive(Copy, Drop, Serde, PartialEq, starknet::Store)]
pub enum ElectionStatus {
    #[default]
    NotActive,
    Started,
    Suspended,
    Ended
}

#[starknet::contract]
pub mod VotingContract {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Vec, VecTrait, MutableVecTrait};
    use super::{Candidate, IVotingTrait, ElectionStatus, CandidateInput};
    use core::poseidon::PoseidonTrait;
    use core::hash::{HashStateTrait, HashStateExTrait};
    use core::option::OptionTrait;

    #[storage]
    pub struct Storage {
        candidates: Map::<u256, Option<Candidate>>, // Maps the id of the candidate to the Candidate struct
        has_voted: Map::<ContractAddress, Option<(bool, u256)>>, // Maps a ContractAddress to if he has voted, and the id of who he voted for
        total_candidates_no: u256,
        total_voters: u256,
        owner: ContractAddress,
        election_status: ElectionStatus,
        existing_candidate_ids: Vec<u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.election_status.write(ElectionStatus::NotActive);
    }

    #[abi(embed_v0)]
    pub impl VotingContractImpl of IVotingTrait<ContractState> {
        fn nominate(ref self: ContractState, candidate_fname: felt252, candidate_lname: felt252) {
            assert(self.election_status.read() != ElectionStatus::Ended, 'Election already ended');
            let id: u256 = generate_id(candidate_fname, candidate_lname);
            let mistake_id: u256 = generate_id(candidate_lname, candidate_fname);
            let no_of_candidates = self.total_candidates_no.read();
            let existing_candidate = self.candidates.entry(id).read();
            let mistake_existing_candidate = self.candidates.entry(mistake_id).read();
            assert(!existing_candidate.is_some(), 'Candidate already exists');
            assert(!mistake_existing_candidate.is_some(), 'Candidate already exists');
            let new_candidate = Candidate {
                id,
                index: no_of_candidates + 1,
                fname: candidate_fname,
                lname: candidate_lname,
                no_of_votes: 0,
                qualified: true
            };
            self.candidates.entry(id).write(Option::Some(new_candidate));
            self.total_candidates_no.write(self.total_candidates_no.read() + 1);
            self.existing_candidate_ids.push(id); //.write(id);
        }
        fn batch_nominate(ref self: ContractState, candidates_data: Array<CandidateInput>) {
            assert(self.election_status.read() != ElectionStatus::Ended, 'Election already ended');
            let mut current_total = self.total_candidates_no.read();

            for i in 0..candidates_data.len() {
                let candidate_input = *candidates_data.at(i);
                let fname = candidate_input.fname;
                let lname = candidate_input.lname;
        
                let id: u256 = generate_id(fname, lname);
                let mistake_id: u256 = generate_id(lname, fname);
                
                assert(
                    !self.candidates.entry(id).read().is_some() 
                    && !self.candidates.entry(mistake_id).read().is_some(),
                    'Candidate already exists'
                );
        
                let new_candidate = Candidate {
                    id,
                    index: current_total + 1,
                    fname,
                    lname,
                    no_of_votes: 0,
                    qualified: true
                };
                
                self.candidates.entry(id).write(Option::Some(new_candidate));
                current_total += 1;
                self.existing_candidate_ids.push(id);
            }
            
            self.total_candidates_no.write(current_total);
        }
        fn start_election(ref self: ContractState) {
            let election_status = self.election_status.read();
            assert(get_caller_address() == self.owner.read(), 'Only owner can change status');
            assert(
                election_status != ElectionStatus::Started && election_status != ElectionStatus::Ended, 
                'Election already started/ended'
            );
            self.election_status.write(ElectionStatus::Started);
        }
        fn cast_vote(ref self: ContractState, candidate_id: u256) {
            assert(
                self.election_status.read() == ElectionStatus::Started, 
                'Election not going on'
            );
            let voter = get_caller_address();
            let has_voted = self.has_voted.entry(voter).read();
            assert(!has_voted.is_some(), 'Caller already voted');
            let candidate = self.candidates.read(candidate_id);
            assert(candidate.is_some(), 'Candidate does not exist');
            if let Option::Some(mut candidate) = candidate {
                candidate.no_of_votes += 1;
                self.candidates.entry(candidate_id).write(Option::Some(candidate));
                self.total_voters.write(self.total_voters.read() + 1);
                self.has_voted.entry(voter).write(Option::Some((true, candidate_id)));
            }
        }
        fn uncast_vote(ref self: ContractState, candidate_id: u256) {
            assert(
                self.election_status.read() == ElectionStatus::Started, 
                'Election ended or not active'
            );
            let voter = get_caller_address();
            let has_voted = self.has_voted.entry(voter).read();
            assert(has_voted.is_some(), 'Caller has not voted');
            if let Option::Some(mut has_voted) = has_voted {
                let (_, voted_candidate_id) = has_voted;
                assert!(voted_candidate_id == candidate_id, "Caller did not vote this candidate");
            }
            let candidate = self.candidates.read(candidate_id);
            assert(candidate.is_some(), 'Candidate does not exist');
            if let Option::Some(mut candidate) = candidate {
                candidate.no_of_votes -= 1;
                self.candidates.entry(candidate_id).write(Option::Some(candidate));
                self.total_voters.write(self.total_voters.read() - 1);
                self.has_voted.entry(voter).write(Option::None);
            }
        }
        fn get_all_candidates(self: @ContractState) -> Array<Candidate> {
            let mut candidates_array: Array<Candidate> = array![];
            
            for i in 0..self.existing_candidate_ids.len() {
                let candidate_id = self.existing_candidate_ids.at(i).read();
                let candidate = self.candidates.entry(candidate_id).read();
                if let Option::Some(candidate) = candidate {
                    candidates_array.append(candidate);
                }
            }

            candidates_array
        }
        fn get_candidate(self: @ContractState, candidate_id: u256) -> (felt252, felt252) {
            let candidate_ref = self.candidates.entry(candidate_id).read();
            assert(candidate_ref.is_some(), 'Candidate does not exist');
            let candidate = candidate_ref.unwrap();
            let candidate_fname = candidate.fname;
            let candidate_lname = candidate.lname;
            (candidate_fname, candidate_lname)
        }
        fn suspend_election(ref self: ContractState) {
            let election_status = self.election_status.read();
            assert(get_caller_address() == self.owner.read(), 'Only owner can change status');
            assert(
                election_status == ElectionStatus::Started,
                'Election already started/ended'
            );
            self.election_status.write(ElectionStatus::Suspended);
        }
        fn disqualify_candidate(ref self: ContractState, candidate_id: u256) {
            assert(get_caller_address() == self.owner.read(), 'Only owner permitted');
            let candidate_ref = self.candidates.entry(candidate_id).read();
            assert(candidate_ref.is_some(), 'Candidate does not exist');
            let mut candidate = candidate_ref.unwrap();
            candidate.qualified = false;
            self.candidates.entry(candidate_id).write(Option::Some(candidate));
        }
        fn count_votes(self: @ContractState) -> (u256, u256, Candidate) {
            let votes_count = self.total_voters.read();
            let all_candidates = self.get_all_candidates();
        
            let mut i = 0;
        
            let mut winning_candidate = Candidate {
                id: 0, 
                index: 0, 
                fname: 'fname', 
                lname: 'lname', 
                no_of_votes: 0, 
                qualified: false
            };
        
            while i < all_candidates.len() {
                let candidate = all_candidates.at(i);
                if *candidate.qualified && *candidate.no_of_votes > winning_candidate.no_of_votes {
                    winning_candidate = *candidate;
                }
                i += 1;
            }
        
            assert(winning_candidate.qualified, 'Winning Candidate not qualified');
            (votes_count, winning_candidate.no_of_votes, winning_candidate)
        }
        
        
        fn end_election(ref self: ContractState) {
            let election_status = self.election_status.read();
            assert(get_caller_address() == self.owner.read(), 'Only owner can change status');
            assert!(
                election_status != ElectionStatus::Ended && election_status != ElectionStatus::NotActive, 
                "Election already ended or not started"
            );
            self.election_status.write(ElectionStatus::Ended);
        }
        // fn sum(ref self: ContractState, x: u64, y: u64) -> u128 {
        //     let result = x + y;
        //     result.into()
        // }
    }

    fn generate_id(fname: felt252, lname: felt252) -> u256 {
        let id = PoseidonTrait::new().update_with(fname).update_with(lname).finalize();
        id.into()
    }


    // fn count_votes(self: @ContractState) -> (u256, u256, Candidate) {
    //     let votes_count = self.total_voters.read();
    //     let all_candidates = self.get_all_candidates();
    
    //     let mut i = 0;
    //     let mut winning_candidate = Candidate {
    //         id: 0, 
    //         index: 0, 
    //         fname: 'fname', 
    //         lname: 'lname', 
    //         no_of_votes: 0, 
    //         qualified: false
    //     };
    
    //     let len = all_candidates.len();
    //     while i < len {
    //         let current_candidate = all_candidates.at(i);
            
    //         // Initialize winning_candidate with the first qualified candidate
    //         if i == 0 && *current_candidate.qualified {
    //             winning_candidate = *current_candidate;
    //         }
            
    //         // Compare with current winning candidate
    //         if *current_candidate.qualified && current_candidate.no_of_votes > winning_candidate.no_of_votes {
    //             winning_candidate = *current_candidate;
    //         }
    
    //         i += 1;
    //     }
        
    //     assert(winning_candidate.qualified, 'Winning Candidate not qualified');
    //     (votes_count, winning_candidate.no_of_votes, winning_candidate)
    // }
}