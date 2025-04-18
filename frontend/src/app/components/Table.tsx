'use client'

import { useSearchParams } from "next/navigation";
import { FaCheck } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import GenericModal from "./internal/util/GenericModal";
import AddNominee from "./AddNomineeForm";
import { Candidates, ContractAddress } from "../common/data";
import TableHeader from "./TableHeader";
import TableControls from "./TableControls";
import { useAccount, useContractRead } from "@starknet-react/core";
import { VotingAbi } from "../common/abis/votingAbi";
import Loading from "./internal/util/Loading";
import { felt252ToString } from "./internal/helpers";
import TableRow from "./TableRow";
import { useMemo, useState } from "react";

export default function Table(){

    const searchParams = useSearchParams()
    const [searchTerm, setSearchTerm] = useState('');

    // TODO - Implement Search Functionality
    const page = searchParams.get("page") || 1;

    const from = (Number(page) - 1) * 5 // 5 is the page size
    const to = Number(page) * 5

    const togglePopover = ({ targetId }: { targetId: string }) => {
        const popover = document.getElementById(targetId);
        // @ts-ignore
        popover.togglePopover();
        if (popover) {
          popover.addEventListener("toggle", () => {
            if (popover.matches(":popover-open")) {
              document.body.style.overflow = "hidden";
            } else {
              document.body.style.overflow = "";
            }
          });
        }
    };

    const { address } = useAccount()

    const {
        data, error, isLoading, isFetching
    } = useContractRead({
        abi: VotingAbi,
        address: ContractAddress,
        functionName: "get_all_candidates",
        args: []
    })

    const allCandidates = (data as Array<any>) || [];


    const filteredCandidate = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return allCandidates.filter((candidate) => {
            const surname = felt252ToString(candidate.lname || "").toLowerCase();
            const firstname = felt252ToString(candidate.fname || "").toLowerCase();

            return surname.includes(search) || firstname.includes(search);
        })
    }, [allCandidates,searchTerm])

    console.log(allCandidates)

    return (
        <div className="w-full mx-auto px-12 py-12">
            
            <TableHeader totalCount={filteredCandidate.length} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            <div className="overflow-x-auto mt-10 rounded-lg">
                <table className="min-w-full table-auto rounded-lg">
                    <thead className="bg-gray-300 text-gray-700 font-medium">
                        <tr className="font-bold">
                            <td className="py-4 px-4">S/N</td>
                            <td className="py-4 px-4 tracking-wider whitespace-nowrap capitalize">Candidate Surname</td>
                            <td className="py-4 px-4 tracking-wider whitespace-nowrap capitalize">Candidate Firstname</td>
                            <td className="py-4 px-4 tracking-wider whitespace-nowrap capitalize">Number of Votes</td>
                            <td className="py-4 px-4 tracking-wider whitespace-nowrap capitalize">Qualification Status</td>
                            <td className="py-4 px-4 tracking-wider whitespace-nowrap capitalize">Vote</td>
                            <th className="py-4 px-4 tracking-wider whitespace-nowrap capitalize">Disqualify</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {
                            filteredCandidate?.slice(from, to).map((candidate, index) => {
                                return <TableRow candidate={candidate} index={index} key={index} />
                            })
                        }
                    </tbody>
                </table>
            </div>

            {/* TABLE CONTROLS */}
            <TableControls togglePopover={togglePopover} filteredCandidates={filteredCandidate} />
            <GenericModal
                popoverId="transaction-modal"
                style=""
            >
                <AddNominee />
            </GenericModal>

        </div>
    )
}