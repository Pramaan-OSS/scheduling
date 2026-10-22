"use client";
import type { RefCallback } from "react";
import { trpc } from "@scheduling/trpc/react";
import { Input, Label } from "@scheduling/ui/components/form";
import { Button } from "@scheduling/ui/components/button";
type Props = { currentUsername: string | undefined; setCurrentUsername?: (value: string) => void; inputUsernameValue: string | undefined; usernameRef: RefCallback<HTMLInputElement>; setInputUsernameValue: (value: string) => void; onSuccessMutation?: () => void; onErrorMutation?: (error: any) => void; readonly?: boolean };
export enum UsernameChangeStatusEnum { UPGRADE = "UPGRADE" }
export function PremiumTextfield(props: Props) {
 const mutation = trpc.viewer.me.updateProfile.useMutation({ onSuccess: () => { props.setCurrentUsername?.(props.inputUsernameValue || ""); props.onSuccessMutation?.(); }, onError: props.onErrorMutation });
 return <div><Label>Booking address</Label><Input ref={props.usernameRef} name="username" value={props.inputUsernameValue || ""} readOnly={props.readonly} onChange={event => props.setInputUsernameValue(event.target.value)} />{!props.readonly && <Button type="button" color="secondary" disabled={mutation.isPending || !props.inputUsernameValue || props.inputUsernameValue === props.currentUsername} onClick={() => mutation.mutate({ username: props.inputUsernameValue })}>Save address</Button>}{mutation.error && <p role="status">{mutation.error.message}</p>}</div>;
}
