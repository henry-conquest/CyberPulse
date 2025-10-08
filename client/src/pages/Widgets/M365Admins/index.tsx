import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ErrorResponseMessage from '@/components/ui/ErrorResponseMessage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { get365Admins } from '@/service/IdentitiesAndPeopleService';
import { identitiesAndPeopleActions } from '@/store/store';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'wouter';

const M365Admins = () => {
  const adminsData = useSelector((state: any) => state?.identitiesAndPeople?.m365Admins);
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const { tenantId } = useParams();
  const dispatch = useDispatch();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState([]);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);
        setError(false);
        if (userId && tenantId) {
          const data = await get365Admins({ tenantId });
          dispatch(identitiesAndPeopleActions.setM365Admins(data));
        }
      } catch (err) {
        console.error('Failed to fetch admin data', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [tenantId, userId]);

  useEffect(() => {
    if (adminsData) {
      setAllMembers(adminsData?.flatMap((role: any) => role.members));
    }
  }, [adminsData]);

  if (error && tenantId) {
    return <ErrorResponseMessage tenantId={tenantId} text="Microsoft 365 Admins" />;
  }

  return (
    <div>
      <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
        <Link
          to={`/tenants/${tenantId}/details`}
          className="inline-flex items-center text-sm text-brand-teal hover:underline"
        >
          ← Back
        </Link>
        <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
      </div>

      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-10 ml-6">Microsoft 365 Admins</h1>

      <Card className="ml-auto mr-auto mb-12 flex-col w-[90%]">
        <CardHeader>
          <CardTitle>Microsoft 365 Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !adminsData ? (
            <div className="text-center py-8 text-gray-600">Loading Microsoft 365 Admins...</div>
          ) : allMembers.length === 0 ? (
            <div className="text-center py-8 text-red-600">No Microsoft 365 Admins found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Name</TableHead>
                  <TableHead className="w-1/3 text-center">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminsData.flatMap((roleObj: any) =>
                  roleObj.members.map((member: any) => (
                    <TableRow key={`${roleObj.role}-${member.id}`}>
                      <TableCell>{`${member.givenName || ''} ${member.surname || ''}`}</TableCell>
                      <TableCell className="text-center">{roleObj.role}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default M365Admins;
