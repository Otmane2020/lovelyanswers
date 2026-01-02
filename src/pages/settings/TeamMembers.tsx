import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MoreHorizontal, Loader2, Mail, Crown, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status?: string;
  isOwner?: boolean;
}

export function TeamMembers() {
  const { project, isLoading: projectLoading } = useActiveProject();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");
  const [isAdding, setIsAdding] = useState(false);

  // Load owner and team members
  useEffect(() => {
    if (!project) return;

    const loadMembers = async () => {
      setIsLoading(true);
      try {
        // Get owner profile
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", project.user_id)
          .single();

        const ownerMember: TeamMember = {
          id: ownerProfile?.id || project.user_id,
          name: ownerProfile?.full_name || "Owner",
          email: ownerProfile?.email || "",
          role: "Owner",
          isOwner: true,
        };

        // Get team members
        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("*")
          .eq("project_id", project.id);

        const membersList: TeamMember[] = [ownerMember];

        if (teamMembers) {
          for (const tm of teamMembers) {
            // If member has user_id, get their profile
            if (tm.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", tm.user_id)
                .single();

              membersList.push({
                id: tm.id,
                name: profile?.full_name || tm.invited_email?.split("@")[0] || "Member",
                email: profile?.email || tm.invited_email || "",
                role: tm.role || "member",
                status: tm.status,
              });
            } else {
              membersList.push({
                id: tm.id,
                name: tm.invited_email?.split("@")[0] || "Invited",
                email: tm.invited_email || "",
                role: tm.role || "member",
                status: tm.status || "pending",
              });
            }
          }
        }

        setMembers(membersList);
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [project]);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !project) return;

    setIsAdding(true);
    try {
      // Check if already invited
      const existingMember = members.find(
        (m) => m.email.toLowerCase() === newMemberEmail.toLowerCase()
      );
      if (existingMember) {
        toast.error("This email is already a team member");
        return;
      }

      const { error } = await supabase.from("team_members").insert({
        project_id: project.id,
        invited_email: newMemberEmail.trim().toLowerCase(),
        role: newMemberRole,
        status: "pending",
      });

      if (error) throw error;

      // Add to local state
      setMembers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: newMemberEmail.split("@")[0],
          email: newMemberEmail.trim().toLowerCase(),
          role: newMemberRole,
          status: "pending",
        },
      ]);

      toast.success("Team member invited successfully");
      setShowAddDialog(false);
      setNewMemberEmail("");
      setNewMemberRole("member");
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add team member");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Team member removed");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove team member");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success("Role updated");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  if (projectLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage your team members
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="w-4 h-4" />
            Add member
          </Button>
        </div>

        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    {member.isOwner && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                    {member.status === "pending" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground capitalize">
                  {member.role}
                </span>
                {!member.isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleChangeRole(
                            member.id,
                            member.role === "admin" ? "member" : "admin"
                          )
                        }
                      >
                        Make {member.role === "admin" ? "Member" : "Admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a new member to collaborate on this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins can manage settings and invite other members.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!newMemberEmail.trim() || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
