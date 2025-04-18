import { useMemo, useState } from "react";
import { useAccount, useContract, useContractWrite, useWaitForTransaction } from "@starknet-react/core";
import { VotingAbi } from "../common/abis/votingAbi";
import { ContractAddress } from "../common/data";
import { CallData } from "starknet";
import Loading from "./internal/util/Loading";

export default function AddNominee() {
    const togglePopover = ({ targetId }: { targetId: string }) => {
        const popover = document.getElementById(targetId);
        if (popover) {
            // @ts-ignore
            popover.togglePopover();
            popover.addEventListener("toggle", () => {
                if (popover.matches(":popover-open")) {
                    document.body.style.overflow = "hidden";
                } else {
                    document.body.style.overflow = "";
                }
            });
        }
    };

    const { address: user } = useAccount();

    const { contract } = useContract({
        abi: VotingAbi,
        address: ContractAddress
    });

    //add a single candidate
    const [candidateFirstname, setCandidateFirstName] = useState("");
    const [candidateLastname, setCandidateLastName] = useState("");

    const singleCall = useMemo(() => {
        const isValid = user && contract && candidateFirstname && candidateLastname;
        if (!isValid) return;
        return [contract.populate("nominate", CallData.compile([candidateFirstname, candidateLastname]))];
    }, [user, candidateFirstname, candidateLastname, contract]);

    const { writeAsync: writeSingleAsync, data: singleData, isPending: singlePending } = useContractWrite({
        calls: singleCall
    });

    const { isLoading: waitSingleLoading, data: singleWaitData } = useWaitForTransaction({
        hash: singleData?.transaction_hash,
        watch: true
    });

    const nominateSingleCandidate = async () => {
        try {
            await writeSingleAsync();
            togglePopover({ targetId: "transaction-modal" });
        } catch (err) {
            console.error(err);
        }
    };

   //add candidates by batch
    const [batchCandidates, setBatchCandidates] = useState<{ firstname: string; lastname: string }[]>([]);
    const [batchFirst, setBatchFirst] = useState("");
    const [batchLast, setBatchLast] = useState("");

    const addBatchCandidate = () => {
        if (batchFirst && batchLast) {
            setBatchCandidates([...batchCandidates, { firstname: batchFirst, lastname: batchLast }]);
            setBatchFirst("");
            setBatchLast("");
        }
    };

    const batchCalls = useMemo(() => {
        if (!user || !contract || batchCandidates.length === 0) return;
        return batchCandidates.map(candidate =>
            contract.populate("nominate", CallData.compile([candidate.firstname, candidate.lastname]))
        );
    }, [user, contract, batchCandidates]);

    const { writeAsync: writeBatchAsync, data: batchData, isPending: batchPending } = useContractWrite({
        calls: batchCalls
    });

    const { isLoading: waitBatchLoading, data: batchWaitData } = useWaitForTransaction({
        hash: batchData?.transaction_hash,
        watch: true
    });

    const batchNominate = async () => {
        try {
            await writeBatchAsync();
            togglePopover({ targetId: "transaction-modal" });
        } catch (err) {
            console.error(err);
        }
    };

    const LoadingState = ({ message }: { message: string }) => (
        <span>
            {message}
            <Loading />
        </span>
    );

    const renderButtonContent = (isPending: boolean, isLoading: boolean, txData: any) => {
        if (isPending) return <LoadingState message="Sending" />;
        if (isLoading) return <LoadingState message="Waiting for Confirmation" />;
        if (txData?.isReverted?.()) return <LoadingState message="Transaction Reverted" />;
        if (txData?.isRejected?.()) return <LoadingState message="Transaction Rejected" />;
        if (txData?.isError?.()) return <LoadingState message="Unexpected Error" />;
        if (txData) return "Transaction Confirmed";
        return null;
    };

    return (
        <div className="px-16 py-8 border border-gray-200 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Add Nominee</h2>

            {/* Single Nomination Form */}
            <form className="mb-10">
                <h3 className="text-lg font-semibold mb-2">Single Candidate</h3>
                <div className="flex flex-col gap-4">
                    <div>
                        <label>First Name</label>
                        <input
                            type="text"
                            className="border px-4 py-2 rounded w-full"
                            value={candidateFirstname}
                            onChange={(e) => setCandidateFirstName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Last Name</label>
                        <input
                            type="text"
                            className="border px-4 py-2 rounded w-full"
                            value={candidateLastname}
                            onChange={(e) => setCandidateLastName(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white py-2 px-4 rounded"
                        onClick={(e) => {
                            e.preventDefault();
                            nominateSingleCandidate();
                        }}
                    >
                        {renderButtonContent(singlePending, waitSingleLoading, singleWaitData) || "Nominate Candidate"}
                    </button>
                </div>
            </form>

            {/* Batch Nomination Form */}
            <form>
                <h3 className="text-lg font-semibold mb-2">Batch Candidates</h3>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-row gap-2">
                        <input
                            type="text"
                            placeholder="First Name"
                            className="border px-4 py-2 rounded w-full"
                            value={batchFirst}
                            onChange={(e) => setBatchFirst(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            className="border px-4 py-2 rounded w-full"
                            value={batchLast}
                            onChange={(e) => setBatchLast(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={addBatchCandidate}
                            className="bg-green-500 text-white px-4 rounded"
                        >
                            Add
                        </button>
                    </div>

                    {batchCandidates.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Candidates List</h4>
                            <ul className="list-disc pl-5 text-sm">
                                {batchCandidates.map((c, i) => (
                                    <li key={i}>
                                        {c.firstname} {c.lastname}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="bg-purple-600 text-white py-2 px-4 rounded mt-4"
                        onClick={(e) => {
                            e.preventDefault();
                            batchNominate();
                        }}
                        disabled={batchCandidates.length === 0}
                    >
                        {renderButtonContent(batchPending, waitBatchLoading, batchWaitData) || "Batch Nominate"}
                    </button>
                </div>
            </form>
        </div>
    );
}
