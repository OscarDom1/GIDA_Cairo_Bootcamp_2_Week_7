import React, { useMemo } from "react";
import {
  CastVote,
  CountVotes,
  EndElection,
  NominateCandidate,
  RemoveVote,
  StarknetSvg,
  StartElection,
} from "./icons";
import { clsx } from "clsx";
import { ContractAddress, SideBarOptions } from "../common/data";
import {
  useAccount,
  useContract,
  useContractWrite,
  useWaitForTransaction,
} from "@starknet-react/core";
import { VotingAbi } from "../common/abis/votingAbi";
import { CallData } from "starknet";
import Loading from "./internal/util/Loading";

export const Sidebar: React.FC<{ classname?: string }> = ({ classname }) => {
  const { address: user } = useAccount();

  const { contract } = useContract({
    abi: VotingAbi,
    address: ContractAddress,
  });

  const calls = useMemo(() => {
    const isValid = user && contract;

    if (!isValid) return;

    return [contract.populate("start_election", CallData.compile([]))];
  }, [user, contract]);

  const suspendCalls = useMemo(() => {
    const isValid = user && contract;

    if (!isValid) return;

    return [contract.populate("suspend_election", CallData.compile([]))];
  }, [user, contract]);

  const endElectionCalls = useMemo(() => {
    const isValid = user && contract;

    if (!isValid) return;

    return [contract.populate("end_election", CallData.compile([]))];
  }, [user, contract]);

  const countVotesCalls = useMemo(() => {
    const isValid = user && contract;
    if (!isValid) return;
    return [contract.populate("count_votes", CallData.compile([]))];
}, [user, contract]);

  const { writeAsync, isPending, data } = useContractWrite({
    calls,
  });

  const {
    writeAsync: suspendElectionWriteAsync,
    isPending: isSuspending,
    data: suspendElectionDataRaw,
  } = useContractWrite({
    calls: suspendCalls,
  });

  const {
    writeAsync: endElectionWriteAsync,
    isPending: isEndingElection,
    data: endElectionDataRaw,
  } = useContractWrite({
    calls: endElectionCalls,
  });

  const {
    writeAsync: countVotesWriteAsync,
    isPending: isCounting,
    data: countVotesDataRaw,
  } = useContractWrite({
    calls: countVotesCalls,
  });

  const {
    isLoading: suspendElectionIsLoading,
    isPending: suspendElectionIsPending,
    isError: suspendElectionIsError,
    isSuccess: suspendElectionIsSuccess,
    data: suspendElectionData,
  } = useWaitForTransaction({
    hash: data?.transaction_hash,
    watch: true,
  });

  const {
    isLoading: startElectionIsLoading,
    isPending: startElectionIsPending,
    isError: startElectionIsError,
    isSuccess: startElectionIsSuccess,
    data: startElectionData,
  } = useWaitForTransaction({
    hash: data?.transaction_hash,
    watch: true,
  });

  const {
    isLoading: endElectionIsLoading,
    isPending: endElectionIsPending,
    isError: endElectionIsError,
    isSuccess: endElectionIsSuccess,
    data: endElectionData,
  } = useWaitForTransaction({
    hash: endElectionDataRaw?.transaction_hash,
    watch: true,
  });

  const {
    isLoading: countVotesIsLoading,
    isPending: countVotesIsPending,
    isError: countVotesIsError,
    isSuccess: countVotesIsSuccess,
    data: countVotesTxData,
  } = useWaitForTransaction({
    hash: countVotesDataRaw?.transaction_hash,
    watch: true,
  });

  const startElection = async () => {
    console.log("Preparing to start election");
    try {
      await writeAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const suspendElection = async () => {
    console.log("Preparing to suspend election");
    try {
      await suspendElectionWriteAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const endElection = async () => {
    console.log("Preparing to end election");
    try {
      await endElectionWriteAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const countVotes = async () => {
    console.log("Preparing to count votes");
    try {
      await countVotesWriteAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const LoadingState = ({ message }: { message: any }) => {
    return (
      <span>
        {message}
        <Loading />
      </span>
    );
  };

  const buttonContent = (message: string) => {
    if (isPending) {
      return <LoadingState message={"Sending"} />;
    }
    if (startElectionIsLoading) {
      return <LoadingState message={"Waiting for Confirmation"} />;
    }
    if (startElectionData && startElectionData.isReverted()) {
      return <LoadingState message={"Transaction Reverted"} />;
    }
    if (startElectionData && startElectionData.isRejected()) {
      return <LoadingState message={"Transaction Rejected"} />;
    }
    if (startElectionData && startElectionData.isError()) {
      return <LoadingState message={"Unexpected error occured"} />;
    }
    if (startElectionData) {
      return "Transaction Confirmed";
    }

    return message;
  };

  const suspendButton = (message: string) => {
    if (isPending) {
      return <LoadingState message={"Sending"} />;
    }
    if (suspendElectionIsLoading) {
      return <LoadingState message={"Waiting for Confirmation"} />;
    }
    if (suspendElectionData && suspendElectionData.isReverted()) {
      return <LoadingState message={"Transaction Reverted"} />;
    }
    if (suspendElectionData && suspendElectionData.isRejected()) {
      return <LoadingState message={"Transaction Rejected"} />;
    }
    if (suspendElectionData && suspendElectionData.isError()) {
      return <LoadingState message={"Unexpected error occured"} />;
    }
    if (suspendElectionData) {
      return "Transaction Confirmed";
    }

    return message;
  };

  const endElectionButton = (message: string) => {
    if (isPending) {
      return <LoadingState message={"Sending"} />;
    }
    if (endElectionIsLoading) {
      return <LoadingState message={"Waiting for Confirmation"} />;
    }
    if (endElectionData && endElectionData.isReverted()) {
      return <LoadingState message={"Transaction Reverted"} />;
    }
    if (endElectionData && endElectionData.isRejected()) {
      return <LoadingState message={"Transaction Rejected"} />;
    }
    if (endElectionData && endElectionData.isError()) {
      return <LoadingState message={"Unexpected error occured"} />;
    }
    if (endElectionData) {
      return "Transaction Confirmed";
    }

    return message;
  };

  const countVotesButton = (message: string) => {
    if (isCounting) return <LoadingState message={"Sending"} />;
    if (countVotesIsLoading)
      return <LoadingState message={"Waiting for Confirmation"} />;
    if (countVotesTxData?.isReverted())
      return <LoadingState message={"Transaction Reverted"} />;
    if (countVotesTxData?.isRejected())
      return <LoadingState message={"Transaction Rejected"} />;
    if (countVotesTxData?.isError())
      return <LoadingState message={"Unexpected error occurred"} />;
    if (countVotesTxData) return "Transaction Confirmed";
    return message;
  };

  return (
    <div
      className={clsx(
        "flex h-full flex-col gap-40 bg-[#0009ab] px-10 py-10 text-l text-white",
      )}
    >
      <div>
        <StarknetSvg />
      </div>

      <div className="mt-10 flex flex-col justify-center gap-6">
        {SideBarOptions.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <div
              role="button"
              key={opt.id}
              className="flex items-center justify-normal gap-2 rounded-md px-4 py-2 hover:bg-blue-400 hover:text-[#0009ab]"
              onClick={() => {
                if (i === 0) {
                  startElection();
                } else if (i === 1) {
                  suspendElection();
                } else if (i === 2) {
                  endElection();
                }else if (i === 3)
                {
                  countVotes();
                }
              }}
            >
              {Icon}
              <span>
                {i === 0
                  ? buttonContent(opt.label)
                  : i === 1
                    ? suspendButton(opt.label)
                    : i === 2
                      ? endElectionButton(opt.label)
                      : countVotesButton(opt.label)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
