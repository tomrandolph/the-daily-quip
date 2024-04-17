"use client";
import { Input } from "./ui/input";

export const InputAnswer = ({ roundId }: { roundId: number }) => {
  return (
    <Input type="text" name="answer" onSubmit={() => inputAnswer(roundId)} />
  );
};
