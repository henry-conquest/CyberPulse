import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserModel } from "@/models/UserModel"
import { deleteInvites } from "@/service/Settings"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, isValid } from "date-fns"

const InvitesTable = (props: any) => {
    const { invites, fetchInvites, allUsers } = props

    // check for any existing invites
    const pendingInvites = invites.filter((invite: any) => {
        return !allUsers.find((user: UserModel) => user.email === invite.email);
    });

    if (pendingInvites.length === 0) {
        return (
          <>
            <CardTitle className='mt-6'>Invites</CardTitle>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    All invites have been accepted.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )
    }
    return (
        <>
        <CardTitle className='mt-6'>Invites</CardTitle>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length > 0 && invites.map((invite: any) => {
                  const hasAcceptedInvite = allUsers.find((user: UserModel) => {
                    return user.email === invite.email
                  })
                  if(hasAcceptedInvite) return
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell></TableCell>
                      <TableCell><Badge variant={'outline'}>PENDING</Badge></TableCell>
                      <TableCell>
                        {isValid(new Date(invite?.created_at)) ? format(new Date(invite.created_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={async () => {
                                await deleteInvites(invite.email)
                                fetchInvites()
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </>
    )
}

export default InvitesTable